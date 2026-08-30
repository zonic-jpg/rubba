import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  serviceClient,
  verifyPaystack,
  verifyFlutterwave,
  verifyStripe,
  lookupTierPrice,
} from "../_shared/verify.ts";

// This endpoint is called ONLY by the payment providers, server-to-server.
// It must (1) prove the request really came from the provider by verifying the
// provider's signature over the RAW body, and (2) confirm the payment by
// re-reading the transaction from the provider's API — never trusting amounts,
// tiers or user ids that arrive unverified in the body.

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Read the raw body ONCE — signature schemes hash the exact bytes.
  const raw = await req.text();

  // 1) Authenticate the sender.
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider"); // paystack | flutterwave | stripe
  let authentic = false;
  if (provider === "paystack") {
    authentic = await verifyPaystack(raw, req.headers.get("x-paystack-signature"));
  } else if (provider === "flutterwave") {
    authentic = verifyFlutterwave(req.headers.get("verif-hash"));
  } else if (provider === "stripe") {
    authentic = await verifyStripe(raw, req.headers.get("stripe-signature"));
  }
  if (!authentic) {
    return new Response(JSON.stringify({ ok: false, error: "signature verification failed" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2) Parse only AFTER the signature passed.
  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad json" }), { status: 400 });
  }

  // 3) Re-verify the transaction against the provider's own API and read the
  //    reference + metadata from the VERIFIED source, not from the request body.
  const verified = await confirmTransaction(provider!, event);
  if (!verified) {
    return new Response(JSON.stringify({ ok: false, error: "transaction not confirmed" }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { reference, userId, tierId, amountPaidNgn, amountPaidUsd, currency } = verified;

  // 4) Confirm the amount actually paid matches the tier's real price (± rounding).
  const price = await lookupTierPrice(tierId);
  if (!price) {
    return new Response(JSON.stringify({ ok: false, error: "unknown tier" }), { status: 400 });
  }
  const paidEnough =
    currency === "USD"
      ? amountPaidUsd >= price.priceUsd - 0.01
      : amountPaidNgn >= price.priceNgn - 1;
  if (!paidEnough) {
    return new Response(JSON.stringify({ ok: false, error: "amount mismatch" }), { status: 402 });
  }

  const svc = serviceClient();

  // 5) Idempotency: reference is unique; if already completed, do nothing.
  const { data: existing } = await svc
    .from("payment_records")
    .select("status")
    .eq("reference", reference)
    .maybeSingle();
  if (existing?.status === "completed") {
    return new Response(JSON.stringify({ ok: true, already: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const rec = await svc.from("payment_records").upsert({
    reference,
    gateway: provider,
    tier_id: tierId,
    user_id: userId,
    amount_ngn: currency === "USD" ? null : amountPaidNgn,
    amount_usd: currency === "USD" ? amountPaidUsd : null,
    currency,
    status: "completed",
  });
  if (rec.error) {
    return new Response(JSON.stringify({ ok: false, error: "record write failed" }), { status: 500 });
  }

  const cycleKey = new Date().toISOString().slice(0, 7);
  const usg = await svc.from("user_usage").upsert({
    user_id: userId,
    cycle_key: cycleKey,
    tier_id: tierId,
    used: 0,
    updated_at: new Date().toISOString(),
  });
  if (usg.error) {
    return new Response(JSON.stringify({ ok: false, error: "usage write failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

/** Re-fetch the transaction from the provider and return trusted values. */
async function confirmTransaction(provider: string, event: any) {
  if (provider === "paystack") {
    const reference = event?.data?.reference;
    if (event?.event !== "charge.success" || !reference) return null;
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.json();
    if (!body?.status || body?.data?.status !== "success") return null;
    return {
      reference,
      userId: body.data.metadata?.userId,
      tierId: body.data.metadata?.tierId,
      amountPaidNgn: (body.data.amount ?? 0) / 100,
      amountPaidUsd: 0,
      currency: "NGN" as const,
    };
  }

  if (provider === "flutterwave") {
    const id = event?.data?.id;
    const reference = event?.data?.tx_ref;
    if (!id || !reference) return null;
    const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY")!;
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${id}/verify`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.json();
    if (body?.status !== "success" || body?.data?.status !== "successful") return null;
    return {
      reference,
      userId: body.data.meta?.userId,
      tierId: body.data.meta?.tierId,
      amountPaidNgn: body.data.amount ?? 0,
      amountPaidUsd: 0,
      currency: "NGN" as const,
    };
  }

  if (provider === "stripe") {
    const session = event?.data?.object;
    if (event?.type !== "checkout.session.completed" || session?.payment_status !== "paid") return null;
    return {
      reference: session.id,
      userId: session.metadata?.userId,
      tierId: session.metadata?.tierId,
      amountPaidNgn: 0,
      amountPaidUsd: (session.amount_total ?? 0) / 100,
      currency: "USD" as const,
    };
  }

  return null;
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, requireUser, lookupTierPrice } from "../_shared/verify.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // M2: require a verified signed-in user before creating any checkout.
  const user = await requireUser(req);
  if (!user) return json({ ok: false, message: "unauthorized" }, 401, cors);

  try {
    const body = await req.json();
    const { gateway, tierId, currency, callbackUrl } = body;

    // H2: the price is looked up server-side by tierId — client amounts are ignored.
    const price = await lookupTierPrice(tierId);
    if (!price) return json({ ok: false, message: "unknown tier" }, 400, cors);

    const amountNgn = price.priceNgn;
    const amountUsd = price.priceUsd;
    const userId = user.id;                 // from the verified JWT, not the body
    const email = user.email ?? body.email; // prefer the verified email
    const ref = `${gateway}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    if (gateway === "paystack") {
      const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
      if (!secret) throw new Error("PAYSTACK_SECRET_KEY not set");
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: amountNgn * 100,
          reference: ref,
          callback_url: `${callbackUrl}&reference=${ref}`,
          metadata: { userId, tierId },
        }),
      });
      const data = await res.json();
      if (!data.status) throw new Error(data.message || "Paystack init failed");
      return json({ ok: true, gateway, reference: ref, authorizationUrl: data.data.authorization_url }, 200, cors);
    }

    if (gateway === "flutterwave") {
      const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
      if (!secret) throw new Error("FLUTTERWAVE_SECRET_KEY not set");
      const res = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_ref: ref,
          amount: amountNgn,
          currency: "NGN",
          redirect_url: `${callbackUrl}&reference=${ref}`,
          customer: { email },
          meta: { userId, tierId },
        }),
      });
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.message || "Flutterwave init failed");
      return json({ ok: true, gateway, reference: ref, authorizationUrl: data.data.link }, 200, cors);
    }

    if (gateway === "stripe") {
      const secret = Deno.env.get("STRIPE_SECRET_KEY");
      if (!secret) throw new Error("STRIPE_SECRET_KEY not set");
      const params = new URLSearchParams();
      params.set("mode", "payment");
      params.set("success_url", `${callbackUrl}&reference=${ref}`);
      params.set("cancel_url", callbackUrl.replace("payment=return", "payment=cancelled"));
      params.set("customer_email", email);
      params.set("line_items[0][price_data][currency]", "usd");
      params.set("line_items[0][price_data][product_data][name]", `Rubba ${tierId}`);
      params.set("line_items[0][price_data][unit_amount]", String(Math.round(amountUsd * 100)));
      params.set("line_items[0][quantity]", "1");
      params.set("metadata[userId]", userId);
      params.set("metadata[tierId]", tierId);
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return json({ ok: true, gateway, reference: ref, authorizationUrl: data.url }, 200, cors);
    }

    return json({ ok: false, message: "Unknown gateway" }, 400, cors);
  } catch (e) {
    return json({ ok: false, message: e instanceof Error ? e.message : "Error" }, 500, cors);
  }
});

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json();
  const { gateway, reference, tierId, userId, status } = body;

  if (status !== "success" && status !== "successful") {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  await supabase.from("payment_records").upsert({
    reference,
    gateway,
    tier_id: tierId,
    user_id: userId,
    status: "completed",
  });

  const cycleKey = new Date().toISOString().slice(0, 7);
  await supabase.from("user_usage").upsert({
    user_id: userId,
    cycle_key: cycleKey,
    tier_id: tierId,
    used: 0,
    updated_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

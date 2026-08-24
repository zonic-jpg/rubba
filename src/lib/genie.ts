import { MOCK_CONTENT } from "../data/seed";
import type { Pathway, PlanStep, Profile, Roadmap } from "../types";

const NF = new Intl.NumberFormat("en-NG");
export const naira = (n: number) => "₦" + NF.format(Math.round(n));

function step(
  id: string,
  label: string,
  category: PlanStep["category"],
  targetAge?: number,
): PlanStep {
  return { id, label, category, targetAge, done: false };
}

export function localRoadmap(
  profile: Profile,
  goals: Set<string>,
  pathways: Pathway[] = MOCK_CONTENT.pathways,
  dreams: string[] = [],
): Roadmap {
  const p = profile;
  const years = Math.max(1, p.target - p.age);
  const infl = 0.15;
  const goalLabels = [...goals]
    .map((id) => MOCK_CONTENT.goals.find((g) => g.id === id)?.label)
    .filter(Boolean) as string[];

  const base: Record<string, number> = {
    security: p.income * 6,
    home: 35_000_000,
    family: 8_000_000,
    education: 12_000_000,
    business: 5_000_000,
    retire: p.income * 12 * 12,
  };

  let target = 0;
  goals.forEach((g) => {
    target += base[g] || 0;
  });

  const fv = target * Math.pow(1 + infl, Math.min(years, 12));
  const rate = p.income > 700_000 ? 0.3 : p.income > 300_000 ? 0.25 : 0.2;
  const feasibleMonthly = Math.round(p.income * rate);
  const projected =
    p.savings * Math.pow(1.16, years) +
    feasibleMonthly * 12 * ((Math.pow(1.16, years) - 1) / 0.16);
  const coverage = Math.min(1.2, projected / Math.max(1, fv));
  const score = Math.max(28, Math.min(94, Math.round(34 + coverage * 55)));
  const pct = Math.round(coverage * 100);

  const q = [0.25, 0.5, 0.75, 1].map((f) => Math.round(p.age + years * f));
  const checkpoints = [
    {
      age: q[0],
      cls: "" as const,
      h: "Foundation",
      p: `Automate ${naira(feasibleMonthly)}/month and build a ${naira(p.income * 3)} emergency buffer.`,
    },
    {
      age: q[1],
      cls: "t" as const,
      h: "Momentum",
      p: `${goalLabels[0] || "Core goal"} roughly ${Math.min(50, Math.round(pct * 0.5))}% funded. Step up as income grows.`,
    },
    {
      age: q[2],
      cls: "g" as const,
      h: "Acceleration",
      p: goals.has("home")
        ? "Diversify into property co-investment and a home deposit plan."
        : "Diversify into higher-yield and dollar assets.",
    },
    {
      age: q[3],
      cls: "g" as const,
      h: "Arrival",
      p: `${goalLabels.join(", ") || "Your goals"} on track at ~${pct}% coverage.`,
    },
  ];

  const steps: PlanStep[] = [
    step("s1", `Automate ${naira(feasibleMonthly)}/month into a money-market fund`, "savings", q[0]),
    step(
      "s2",
      `Hold 3–6 months expenses (${naira(p.income * 3)}–${naira(p.income * 6)}) in liquid savings`,
      "savings",
      q[0],
    ),
    goals.has("home")
      ? step("s3", "Open a dedicated home-deposit plan; explore co-operative mortgage routes", "home", q[1])
      : step("s3", "Open a goal account for your top priority", "savings", q[1]),
    goals.has("education")
      ? step("s4", "Start an education fund with locked auto-debits", "education", q[1])
      : step("s4", "Move long-horizon money into a dollar fund to hedge inflation", "savings", q[2]),
    goals.has("business")
      ? step("s5", "Ring-fence a business pot; reinvest profits; raise savings 10% with each raise", "business", q[2])
      : step("s5", "Increase contributions 10% each time income rises", "savings", q[2]),
  ];

  if (goals.has("family")) {
    steps.push(step("s6", "Review family health cover and dependant provisions", "family", q[1]));
  }
  if (dreams.includes("Buy a car") || goals.has("business")) {
    steps.push(
      step("s7", "Research reliable transport — new or inspected used — within budget", "car", q[2]),
    );
  }
  steps.push(
    step("s8", "Set up pension top-ups and long-term retirement ladder", "retirement", q[3]),
  );

  return {
    headline: `A ${years}-year plan to ${goalLabels.slice(0, 2).join(" and ") || "financial security"}`,
    intro: `Based on ${naira(p.income)}/month in ${p.city}, ${naira(p.savings)} saved, and a window to age ${p.target} — paced to your life, not someone else's highlight reel.`,
    score,
    monthly: feasibleMonthly,
    years,
    checkpoints,
    steps,
    pathways,
  };
}

export async function genieRoadmap(
  profile: Profile,
  goals: Set<string>,
  ctx: {
    inspiration?: string | null;
    dreams?: string[];
    customText?: string;
    personas?: typeof MOCK_CONTENT.personas;
    pathways?: Pathway[];
  },
): Promise<Roadmap> {
  const pathways = ctx.pathways ?? MOCK_CONTENT.pathways;
  const personas = ctx.personas ?? MOCK_CONTENT.personas;
  const endpoint = import.meta.env.VITE_GENIE_API_URL as string | undefined;
  if (!endpoint) return localRoadmap(profile, goals, pathways, ctx.dreams ?? []);

  try {
    const insp = ctx.inspiration ? personas.find((x) => x.id === ctx.inspiration) : null;
    const prompt = `You are Rubba, a Nigerian life-planning assistant. Return ONLY valid JSON, no markdown.
User: age ${profile.age}, income ₦${profile.income}/month, savings ₦${profile.savings}, ${profile.dependants} dependants, city ${profile.city}, plan to age ${profile.target}.
Goals: ${[...goals].join(", ")}.
${insp ? `Inspiration: ${insp.name} — ${insp.text}. Milestones: ${insp.milestones.map((m) => `${m.age}:${m.label}`).join("; ")}` : ""}
${ctx.dreams?.length ? `Dreams: ${ctx.dreams.join("; ")}.` : ""}
${ctx.customText ? `Their words: "${ctx.customText}".` : ""}
Produce JSON: headline, intro, score (0-100), monthly (int), years (int),
checkpoints (4 of {age,h,p,cls:""|"t"|"g"}),
steps (5-8 of {id,label,category,targetAge}) where category is one of: savings,home,car,education,family,business,insurance,travel,retirement,
pathways (4 of {id,t,d,y,c}).
Realistic for Nigeria. Not regulated financial advice.`;

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) throw new Error("genie failed");
    const data = await r.json();
    const txt = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();
    const rm = JSON.parse(txt) as Roadmap;
    if (!rm.pathways?.length) rm.pathways = pathways;
    if (!rm.steps?.length) throw new Error("bad shape");
    rm.steps = rm.steps.map((s, i) => ({ ...s, id: s.id || `g${i}`, done: false }));
    return rm;
  } catch {
    return localRoadmap(profile, goals, pathways, ctx.dreams ?? []);
  }
}

export type { Profile, Roadmap };

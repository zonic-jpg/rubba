import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { genieRoadmap, naira } from "../lib/genie";
import type { Profile } from "../lib/genie";
import HeroBanner from "../components/HeroBanner";
import PageHero from "../components/PageHero";
import UsageBar from "../components/UsageBar";
import BrandStrip from "../components/BrandStrip";
import TierCards from "../components/TierCards";
import { LANDING_MOSAIC, PERSONA_IMAGES } from "../data/pageImages";
import { ageBand, profileCompletion, track } from "../lib/analytics";
import { loadSavedBrandLinks, toggleSavedBrandLink } from "../lib/savedBrandLinks";
import type { SavedBrandLink } from "../lib/savedBrandLinks";

const EMPLOYMENT_OPTIONS = [
  "",
  "Student",
  "Employed (full-time)",
  "Employed (part-time)",
  "Self-employed",
  "Business owner",
  "Between roles",
];

const INTEREST_TAGS = [
  "Tech & courses",
  "Cars & mobility",
  "Home ownership",
  "Business & investing",
  "Family & health",
  "Travel & lifestyle",
];

function SavedBrandLinksPanel() {
  const [links, setLinks] = useState<SavedBrandLink[]>(() => loadSavedBrandLinks());
  const refresh = () => setLinks(loadSavedBrandLinks());

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (!links.length) return null;

  return (
    <div className="saved-links-box" aria-live="polite">
      <h3>Saved brand links</h3>
      <p>Partner links you saved from adverts — kept here for later. Rubba does not open them for you.</p>
      <ul className="saved-links-list">
        {links.map((l) => (
          <li key={l.id}>
            <span>
              <b>{l.title}</b>
              <span className="hint"> · {l.sponsor}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                toggleSavedBrandLink(l);
                refresh();
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Planner() {
  const { content } = useStore();
  const userGateOn = content.monetization?.userGate.active;
  const [step, setStep] = useState(0);
  const go = (s: number) => {
    setStep(s);
    window.scrollTo(0, 0);
  };

  const stepLabels = userGateOn
    ? ["Profile", "Inspiration", "Plans", "Roadmap"]
    : ["Profile", "Inspiration", "Roadmap"];

  return (
    <div className="wrap">
      {step === 0 && <HeroBanner />}
      {step > 0 && step < 4 && (
        <div className="steps-ind">
          {stepLabels.map((t, i) => {
            const stepNum = i + 1;
            const isActive = userGateOn
              ? step === stepNum
              : (stepNum <= 2 ? step === stepNum : false);
            return (
              <i key={t} className={isActive ? "on" : ""}>
                {stepNum} · {t}
              </i>
            );
          })}
        </div>
      )}
      {step === 0 && <Landing onStart={() => go(1)} />}
      {step === 1 && <Step1 onNext={() => go(2)} />}
      {step === 2 && (
        <Step2
          onBack={() => go(1)}
          onNext={() => go(userGateOn ? 3 : 4)}
        />
      )}
      {step === 3 && userGateOn && (
        <StepPlans onBack={() => go(2)} onNext={() => go(4)} />
      )}
      {step === 4 && (
        <Step3
          onRestart={() => go(1)}
          onBack={() => go(userGateOn ? 3 : 2)}
        />
      )}
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  const { content } = useStore();
  const userGateOn = content.monetization?.userGate.active;
  return (
    <>
      <div className="story-mosaic" aria-label="Real stories from young Nigerians building their future">
        {LANDING_MOSAIC.map((tile) => (
          <figure className="story-tile" key={tile.src}>
            <img src={tile.src} alt={tile.alt} loading="lazy" />
            <div className="story-tile-overlay" />
          </figure>
        ))}
      </div>
      {userGateOn && <UsageBar />}
      {userGateOn && <TierCards compact />}
      <button type="button" className="cta gold" onClick={onStart}>
        Start your plan →
      </button>
      <p className="landing-note">{content.settings.messaging.trackingIntro}</p>
    </>
  );
}

function Step1({ onNext }: { onNext: () => void }) {
  const { profile, setProfile, content, goals, toggleGoal } = useStore();
  const [p, setP] = useState<Profile>(profile);
  const years = Math.max(0, p.target - p.age);
  const set = (k: keyof Profile, v: number | string) => setP((s) => ({ ...s, [k]: v }));
  const toggleInterest = (tag: string) =>
    setP((s) => {
      const cur = new Set(s.interests ?? []);
      cur.has(tag) ? cur.delete(tag) : cur.add(tag);
      return { ...s, interests: [...cur] };
    });
  const target = Math.max(p.age + 1, p.target);
  const completion = profileCompletion({ ...p, target });

  return (
    <>
      <PageHero imageKey="profile" label="Your starting point" />
      <div className="eyebrow">Step 1 — where you are today</div>
      <h1>
        Let's start with <em>your real starting point.</em>
      </h1>
      <p className="lead">No filters. Just your age, income, savings, and what matters to you.</p>
      <UsageBar />

      <div className="profile-progress" role="status">
        <div className="profile-progress-top">
          <span>Profile {completion.pct}% complete</span>
          <span className="profile-progress-hint">
            {completion.pct >= 100
              ? "Nice — you'll get the sharpest roadmap & most relevant Value Zone offers."
              : "Add the optional details below for a sharper roadmap & better-matched offers."}
          </span>
        </div>
        <div className="profile-progress-track">
          <div className="profile-progress-fill" style={{ width: `${completion.pct}%` }} />
        </div>
      </div>

      <div className="grid2">
        <div className="field">
          <label>Your age</label>
          <input type="number" min={16} max={80} value={p.age} onChange={(e) => set("age", +e.target.value)} />
        </div>
        <div className="field">
          <label>
            Dependants <span className="hint">(children, others)</span>
          </label>
          <input type="number" min={0} max={15} value={p.dependants} onChange={(e) => set("dependants", +e.target.value)} />
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label>Monthly income</label>
          <div className="prefix">
            <span>₦</span>
            <input type="number" min={0} step={10000} value={p.income} onChange={(e) => set("income", +e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Current savings</label>
          <div className="prefix">
            <span>₦</span>
            <input type="number" min={0} step={50000} value={p.savings} onChange={(e) => set("savings", +e.target.value)} />
          </div>
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label>Where you live</label>
          <select value={p.city} onChange={(e) => set("city", e.target.value)}>
            {content.cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>
            Work status <span className="hint">(optional)</span>
          </label>
          <select value={p.employmentStatus ?? ""} onChange={(e) => set("employmentStatus", e.target.value)}>
            {EMPLOYMENT_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o === "" ? "Prefer not to say" : o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>
          What do you do? <span className="hint">(optional — helps tailor courses & careers)</span>
        </label>
        <input
          type="text"
          value={p.occupation ?? ""}
          placeholder="e.g. Marketer, developer, trader, nurse…"
          onChange={(e) => set("occupation", e.target.value)}
        />
      </div>

      <div className="field">
        <label>
          Interests <span className="hint">(optional — matches you to Value Zone offers)</span>
        </label>
        <div className="chips">
          {INTEREST_TAGS.map((tag) => {
            const on = (p.interests ?? []).includes(tag);
            return (
              <div
                key={tag}
                className={`chip ${on ? "on" : ""}`}
                style={on ? { background: "var(--teal)", borderColor: "transparent", color: "#fff" } : {}}
                onClick={() => toggleInterest(tag)}
              >
                {tag}
              </div>
            );
          })}
        </div>
      </div>
      <p className="privacy-note">
        Why we ask: optional details sharpen your plan and match offers. We anonymize them (age
        bands, never exact DOB) for aggregate insights and never sell your data.
      </p>

      <SavedBrandLinksPanel />

      <div className="field">
        <label>Planning window</label>
        <div className="slider-card">
          <div className="slider-top">
            <span className="now">
              From age <b>{p.age}</b>
            </span>
            <span className="yrs">{years} year plan</span>
          </div>
          <input type="range" min={p.age + 1} max={85} step={1} value={target} onChange={(e) => set("target", +e.target.value)} />
          <div className="slider-ends">
            <span>now</span>
            <span>
              to age <b>{target}</b>
            </span>
          </div>
        </div>
      </div>

      <div className="field">
        <label>
          What matters most? <span className="hint">pick any</span>
        </label>
        <div className="chips">
          {content.goals.map((g) => (
            <div
              key={g.id}
              className={`chip ${goals.has(g.id) ? "on" : ""}`}
              style={goals.has(g.id) ? { background: g.col, borderColor: "transparent", color: "#fff" } : {}}
              onClick={() => toggleGoal(g.id)}
            >
              <span className="d" style={{ background: g.col }} />
              {g.label}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="cta"
        onClick={() => {
          const finalProfile = { ...p, target };
          setProfile(finalProfile);
          if (goals.size === 0) toggleGoal("security");
          const comp = profileCompletion(finalProfile);
          track("profile_completion", {
            pct: comp.pct,
            ageBand: ageBand(finalProfile.age),
            city: finalProfile.city,
            employmentStatus: finalProfile.employmentStatus || undefined,
            hasOccupation: Boolean(finalProfile.occupation),
            interestCount: finalProfile.interests?.length ?? 0,
            planningHorizonYears: Math.max(0, target - finalProfile.age),
          });
          onNext();
        }}
      >
        Continue to inspiration →
      </button>
    </>
  );
}

function Step2({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { goals, content, inspiration, setInspiration, dreams, toggleDream, customText, setCustomText, profile } =
    useStore();
  const [text, setText] = useState(customText);

  const matches = useMemo(
    () =>
      [...content.personas]
        .map((p) => ({ p, s: p.goals.filter((g) => goals.has(g)).length }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.p),
    [content.personas, goals],
  );

  return (
    <>
      <PageHero imageKey="inspiration" label="Paths that worked" />
      <div className="eyebrow">Step 2 — pick a path</div>
      <h1>
        People who got <em>where you want to go.</em>
      </h1>
      <p className="lead">{content.settings.messaging.antiHype}</p>

      <div className="insp-grid">
        {matches.map((p) => {
          const yearsAhead = p.achievedAge - profile.age;
          const portrait = PERSONA_IMAGES[p.id];
          return (
            <div
              key={p.id}
              className={`insp ${inspiration === p.id ? "sel" : ""}`}
              onClick={() => setInspiration(inspiration === p.id ? null : p.id)}
            >
              {portrait && (
                <div className="insp-photo">
                  <img src={portrait.src} alt={portrait.alt} loading="lazy" />
                  <div className="insp-photo-overlay" />
                </div>
              )}
              <div className="pick">{inspiration === p.id ? "✓" : ""}</div>
              <div className="av" style={{ background: p.av }}>
                {p.name[0]}
              </div>
              <h3>{p.name}</h3>
              <div className="meta">
                {p.city} · {p.kind === "composite" ? "Composite profile" : "Real-inspired"} · by age {p.achievedAge}
                {yearsAhead > 0 && ` (${yearsAhead} yrs from you)`}
              </div>
              <p>{p.text}</p>
              <div className="milestone-row">
                {p.milestones.map((m) => (
                  <span key={m.label} className="ms-tag" title={`Age ${m.age}`}>
                    {m.icon} {m.label}
                  </span>
                ))}
              </div>
              <div className="tags">
                {p.tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="divider">or set your own vision</div>
      <div className="field">
        <label>Pick dreams that speak to you</label>
        <div className="dream-menu">
          {content.dreams.map((d) => (
            <div
              key={d}
              className={`chip ${dreams.has(d) ? "on" : ""}`}
              style={dreams.has(d) ? { background: "var(--violet)", borderColor: "transparent", color: "#fff" } : {}}
              onClick={() => toggleDream(d)}
            >
              {d}
            </div>
          ))}
        </div>
      </div>
      <div className="field">
        <label>…or describe it in your own words</label>
        <textarea
          value={text}
          placeholder="e.g. Married by 30, own a 3-bed in Lekki, child in good school by 40, reliable car."
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="row row-actions">
        <button type="button" className="ghost row-back" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="cta gold row-next"
          onClick={() => {
            setCustomText(text.trim());
            onNext();
          }}
        >
          Continue to plans →
        </button>
      </div>
    </>
  );
}

function StepPlans({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { content, canGenerate, openBilling, usageInfo } = useStore();

  return (
    <>
      <PageHero imageKey="plans" label="Choose your pace" />
      <div className="eyebrow">Step 3 — your plan allowance</div>
      <h1>
        How many <em>roadmaps</em> this month?
      </h1>
      <p className="lead">{content.settings.messaging.tierIntro}</p>
      <UsageBar />
      <TierCards />

      {!canGenerate ? (
        <div className="limit-box">
          <p>{content.settings.messaging.limitReached}</p>
          {content.monetization?.userGate.postAllowanceBehavior !== "read_only" && (
            <button type="button" className="cta gold" onClick={openBilling}>
              Upgrade now
            </button>
          )}
        </div>
      ) : (
        <p className="plan-ready">
          You have <strong>{usageInfo.remaining}</strong> generation{usageInfo.remaining === 1 ? "" : "s"} ready.
        </p>
      )}

      <div className="row row-actions">
        <button type="button" className="ghost row-back" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="cta row-next"
          disabled={!canGenerate}
          onClick={onNext}
        >
          Draw up my roadmap ✨
        </button>
      </div>
    </>
  );
}

function Step3({ onRestart, onBack }: { onRestart: () => void; onBack: () => void }) {
  const store = useStore();
  const {
    profile,
    goals,
    inspiration,
    dreams,
    customText,
    roadmap,
    setRoadmap,
    setInspiration,
    content,
    consumeGen,
    canGenerate,
    openBilling,
    toggleStepDone,
  } = store;
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const run = async () => {
    if (!consumeGen()) {
      setBlocked(true);
      setLoading(false);
      return;
    }
    setBlocked(false);
    setLoading(true);
    const rm = await genieRoadmap(profile, goals, {
      inspiration,
      dreams: [...dreams],
      customText,
      personas: content.personas,
      pathways: content.pathways,
    });
    setRoadmap(rm);
    setLoading(false);
    track("roadmap_generated", {
      ageBand: ageBand(profile.age),
      city: profile.city,
      goalCount: goals.size,
      years: rm.years,
    });
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="gen">
        <PageHero imageKey="roadmap" label="Building your roadmap" variant="full" />
        <div className="genie">🪔</div>
        <p>Rubba is drawing up your roadmap…</p>
        <div className="dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (blocked || !roadmap) {
    const behavior = content.monetization?.userGate.postAllowanceBehavior ?? "soft_prompt";
    return (
      <div className="limit-box">
        <h2>Monthly limit reached</h2>
        <p>{content.settings.messaging.limitReached}</p>
        {behavior !== "read_only" && (
          <button type="button" className="cta gold" onClick={openBilling}>
            {behavior === "hard_block" ? "Upgrade to continue" : "Upgrade for more plans"}
          </button>
        )}
        {behavior === "soft_prompt" && (
          <p className="limit-soft">
            You can still browse your previous roadmap or start a new plan next month.
          </p>
        )}
        <button type="button" className="ghost" onClick={onBack}>
          ← Back
        </button>
      </div>
    );
  }

  const r = roadmap;
  const doneCount = r.steps.filter((s) => s.done).length;
  const progressPct = r.steps.length ? Math.round((doneCount / r.steps.length) * 100) : 0;

  return (
    <>
      <PageHero imageKey="roadmap" label="Your journey ahead" variant="full" />
      <div className="rm-head">
        <div className="e">Your Rubba roadmap</div>
        <h2>{r.headline}</h2>
        <p>{r.intro}</p>
        <div className="score">
          <div className="b">
            <small>Plan score</small>
            <b>{Math.round(r.score)}/100</b>
          </div>
          <div className="b">
            <small>Suggested monthly</small>
            <b>{naira(r.monthly)}</b>
          </div>
          <div className="b">
            <small>Progress</small>
            <b>{progressPct}%</b>
          </div>
        </div>
      </div>

      <p className="track-hint">{content.settings.messaging.trackingIntro}</p>

      <div className="sec-t violet">Milestones by age</div>
      <div className="timeline">
        {r.checkpoints.map((c, i) => (
          <div className={`cp ${c.cls || ""}`} key={i}>
            <div className="age">By age {c.age}</div>
            <h4>{c.h}</h4>
            <p>{c.p}</p>
          </div>
        ))}
      </div>

      <div className="sec-t teal">Steps to take — tick as you go</div>
      <ol className="steps-list trackable">
        {r.steps.map((s, i) => (
          <li key={s.id} className={s.done ? "done" : ""}>
            <button type="button" className="tick" onClick={() => toggleStepDone(s.id)} aria-label="Toggle done">
              {s.done ? "✓" : i + 1}
            </button>
            <div className="step-body">
              <p>{s.label}</p>
              <BrandStrip category={s.category} brands={content.brands} intro={content.settings.messaging.brandIntro} />
            </div>
          </li>
        ))}
      </ol>

      <div className="sec-t gold">Pathways to fund it</div>
      <div className="pathways">
        {r.pathways.map((pw) => (
          <div className="pw" key={pw.id ?? pw.t}>
            <div className="pt">
              <span className="d" style={{ background: pw.c }} />
              {pw.t}
            </div>
            <p>{pw.d}</p>
            <div className="yield">{pw.y}</div>
          </div>
        ))}
      </div>
      <BrandStrip category="savings" brands={content.brands} />

      <div className="caution">
        <b>Please note:</b> Rubba is a planning tool, not a financial adviser. Brand cards are sponsored options — always
        verify before you buy. Figures are estimates, not guarantees.
      </div>

      <div className="row row-actions row-actions--triple">
        <button type="button" className="ghost row-back" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="ghost row-mid"
          onClick={() => {
            setInspiration(null);
            setRoadmap(null);
            onRestart();
          }}
        >
          Start over
        </button>
        <button type="button" className="cta row-next" disabled={!canGenerate} onClick={run}>
          Regenerate
        </button>
      </div>
    </>
  );
}

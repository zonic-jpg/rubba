import { getDataMode, isProductionData } from "./config";
import { MOCK_CONTENT, DEFAULT_MONETIZATION } from "../data/seed";
import { supabase } from "./supabase";
import type { SiteContent } from "../types";

const LS_CONTENT = "rubba_site_content";
const LS_MODE = "rubba_data_mode_override";

export function getEffectiveDataMode(): "mock" | "production" {
  const override = localStorage.getItem(LS_MODE) as "mock" | "production" | null;
  if (override) return override;
  return getDataMode();
}

export function setDataModeOverride(mode: "mock" | "production" | null) {
  if (mode) localStorage.setItem(LS_MODE, mode);
  else localStorage.removeItem(LS_MODE);
}

/** Backfill any newly-added top-level fields from seed so older saved content
 *  (e.g. localStorage without offers/blog) never renders a broken/blank zone. */
function normalizeContent(c: SiteContent): SiteContent {
  return {
    ...structuredClone(MOCK_CONTENT),
    ...c,
    offers: c.offers?.length ? c.offers : structuredClone(MOCK_CONTENT.offers),
    blog: c.blog?.length ? c.blog : structuredClone(MOCK_CONTENT.blog),
    monetization: c.monetization ?? structuredClone(DEFAULT_MONETIZATION),
  };
}

function loadMockFromLocal(): SiteContent | null {
  try {
    const raw = localStorage.getItem(LS_CONTENT);
    if (!raw) return null;
    return normalizeContent(JSON.parse(raw) as SiteContent);
  } catch {
    return null;
  }
}

export function saveMockContentLocally(content: SiteContent) {
  localStorage.setItem(LS_CONTENT, JSON.stringify(content));
}

export async function loadSiteContent(): Promise<SiteContent> {
  const mode = getEffectiveDataMode();
  if (mode === "mock" || !isProductionData() || !supabase) {
    return loadMockFromLocal() ?? structuredClone(MOCK_CONTENT);
  }

  try {
    const [settingsRes, tiersRes, personasRes, pathwaysRes, brandsRes, contentRes] =
      await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "main").maybeSingle(),
        supabase.from("paid_tiers").select("*").order("sort"),
        supabase.from("personas").select("*").order("sort"),
        supabase.from("pathways").select("*").order("sort"),
        supabase.from("brand_cards").select("*").order("sort"),
        supabase.from("content").select("value").eq("key", "site").maybeSingle(),
      ]);

    const settingsRow = settingsRes.data?.value;
    const siteRow = contentRes.data?.value as Partial<SiteContent> | undefined;

    const base = structuredClone(MOCK_CONTENT);
    if (settingsRow) Object.assign(base.settings, settingsRow);
    if (siteRow?.brand) base.brand = siteRow.brand;
    if (siteRow?.pages) base.pages = siteRow.pages;
    if (siteRow?.goals?.length) base.goals = siteRow.goals;
    if (siteRow?.dreams?.length) base.dreams = siteRow.dreams;
    if (siteRow?.cities?.length) base.cities = siteRow.cities;
    if ((siteRow as any)?.monetization) base.monetization = (siteRow as any).monetization;

    if (tiersRes.data?.length) {
      base.tiers = tiersRes.data.map((t: any) => ({
        id: t.id,
        name: t.name,
        generationsPerMonth: t.generations_per_month,
        priceNgn: t.price_ngn,
        priceUsd: t.price_usd,
        description: t.description,
        highlight: t.highlight,
        stripePriceId: t.stripe_price_id,
      }));
    }

    if (personasRes.data?.length) {
      base.personas = personasRes.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        city: p.city,
        achievedAge: p.achieved_age ?? p.age,
        av: p.av,
        goals: p.goals ?? [],
        text: p.story,
        tags: p.tags ?? [],
        milestones: p.milestones ?? [],
      }));
    }

    if (pathwaysRes.data?.length) {
      base.pathways = pathwaysRes.data.map((p: any) => ({
        id: p.id,
        t: p.title,
        d: p.description,
        y: p.yield_label,
        c: p.colour,
      }));
    }

    if (brandsRes.data?.length) {
      base.brands = brandsRes.data.map((b: any) => ({
        id: b.id,
        category: b.category,
        title: b.title,
        subtitle: b.subtitle,
        logoEmoji: b.logo_emoji,
        logoUrl: b.logo_url,
        ctaLabel: b.cta_label,
        ctaUrl: b.cta_url,
        sponsor: b.sponsor,
        sort: b.sort,
        active: b.active,
      }));
    }

    return base;
  } catch {
    return loadMockFromLocal() ?? structuredClone(MOCK_CONTENT);
  }
}

export async function persistSiteContent(content: SiteContent, isAdmin: boolean): Promise<boolean> {
  if (!isAdmin) return false;
  const mode = getEffectiveDataMode();

  if (mode === "mock" || !isProductionData() || !supabase) {
    saveMockContentLocally(content);
    return true;
  }

  try {
    await supabase.from("app_settings").upsert({
      key: "main",
      value: content.settings,
      updated_at: new Date().toISOString(),
    });
    await supabase.from("content").upsert({
      key: "site",
      value: {
        brand: content.brand,
        pages: content.pages,
        goals: content.goals,
        dreams: content.dreams,
        cities: content.cities,
        monetization: content.monetization,
      },
      updated_at: new Date().toISOString(),
    });

    for (const tier of content.tiers) {
      await supabase.from("paid_tiers").upsert({
        id: tier.id,
        name: tier.name,
        generations_per_month: tier.generationsPerMonth,
        price_ngn: tier.priceNgn,
        price_usd: tier.priceUsd,
        description: tier.description,
        highlight: tier.highlight ?? false,
        stripe_price_id: tier.stripePriceId ?? null,
        sort: content.tiers.indexOf(tier),
      });
    }

    for (const p of content.personas) {
      await supabase.from("personas").upsert({
        id: p.id,
        name: p.name,
        kind: p.kind,
        city: p.city,
        achieved_age: p.achievedAge,
        av: p.av,
        goals: p.goals,
        story: p.text,
        tags: p.tags,
        milestones: p.milestones,
        sort: content.personas.indexOf(p),
      });
    }

    for (const pw of content.pathways) {
      await supabase.from("pathways").upsert({
        id: pw.id,
        title: pw.t,
        description: pw.d,
        yield_label: pw.y,
        colour: pw.c,
        sort: content.pathways.indexOf(pw),
      });
    }

    for (const b of content.brands) {
      await supabase.from("brand_cards").upsert({
        id: b.id,
        category: b.category,
        title: b.title,
        subtitle: b.subtitle,
        logo_emoji: b.logoEmoji,
        logo_url: b.logoUrl,
        cta_label: b.ctaLabel,
        cta_url: b.ctaUrl,
        sponsor: b.sponsor,
        sort: b.sort,
        active: b.active,
      });
    }

    return true;
  } catch {
    saveMockContentLocally(content);
    return false;
  }
}

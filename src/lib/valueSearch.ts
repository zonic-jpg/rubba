/**
 * Value Zone search — one sentence, several facets.
 *
 * A member typing "free coursera courses under 5 minutes" is naming three
 * different things at once. Dropping the whole sentence into a fuzzy text match
 * loses all of it, so the phrase is parsed into real filters that are ANDed
 * across groups and ORed inside a group, exactly like the category buttons.
 *
 * Offers and articles hold different facets, so filters are applied per scope:
 * category/perk/sponsor narrow offers, tag/read-time narrow articles, and free
 * text is only used for whatever the parser could not turn into a facet.
 */
import { OFFER_CATEGORY_LABELS } from "../types";
import type { BlogPost, BrandOffer, OfferCategory } from "../types";

export type ValueScope = "offers" | "blog";

/** What a sponsor is offering, read off the card badge. */
export type PerkId = "free" | "discount" | "bonus" | "priority";

export const PERK_LABELS: Record<PerkId, string> = {
  free: "Free to start",
  discount: "Discounted",
  bonus: "Bonus or match",
  priority: "Member priority",
};

/** Badge wording each perk covers — offers carry no structured perk field. */
const PERK_BADGE_RE: Record<PerkId, RegExp> = {
  free: /\b(free|no cost|complimentary)\b/i,
  discount: /\b(discount|discounted|deal|reduced|member rate|off)\b/i,
  bonus: /\b(bonus|match|matched|cashback|credit)\b/i,
  priority: /\b(priority|early access|exclusive|first look)\b/i,
};

export type ValueFilters = {
  categories: OfferCategory[];
  perks: PerkId[];
  sponsors: string[];
  tags: string[];
  readMin: number | null;
  readMax: number | null;
  savedOnly: boolean;
  /** Residual free text — only set when nothing structured could be parsed. */
  text: string;
};

export const EMPTY_VALUE_FILTERS: ValueFilters = {
  categories: [],
  perks: [],
  sponsors: [],
  tags: [],
  readMin: null,
  readMax: null,
  savedOnly: false,
  text: "",
};

export type ValueChip = {
  id: string;
  group: keyof ValueFilters | "read";
  value: string;
  label: string;
};

/**
 * Words a member is likely to type → Value Zone categories.
 * Only strong signals belong here: category is ANDed against the other groups,
 * so a loose guess would empty the result set.
 */
const CATEGORY_SYNONYMS: [RegExp, OfferCategory][] = [
  [/\b(school|schooling|tuition|universit(?:y|ies)|degree|scholarships?|edusave|education(?:al)?)\b/, "education"],
  [/\b(courses?|certificates?|certifications?|bootcamps?|learn(?:ing)?|upskill(?:ing)?|training|coding)\b/, "courses"],
  [/\b(cars?|vehicles?|driving|bikes?|transport|mobility|sedans?|suvs?)\b/, "mobility"],
  [/\b(savings?|save|invest(?:ing|ment)?s?|vaults?|money|funds?|finance|financial|loans?)\b/, "finance"],
  [/\b(careers?|jobs?|roles?|hiring|recruit(?:ing|ment)?|cv|resumes?|employment|talent)\b/, "career"],
  [/\b(health(?:care)?|medical|hospitals?|hmo|clinics?|insurance|cover|wellness)\b/, "health"],
  [/\b(house|houses|homes?|housing|rent|renting|rent-to-own|estates?|mortgages?|apartments?|land)\b/, "housing"],
  [/\b(lifestyle|travel|holidays?|leisure|fitness|gym)\b/, "lifestyle"],
];

const PERK_QUERY_RE: [RegExp, PerkId][] = [
  [/\b(free|no cost|free month|free trial)\b/, "free"],
  [/\b(discount(?:ed)?|deals?|cheaper|member rate|reduced)\b/, "discount"],
  [/\b(bonus|match(?:ed|ing)?|cashback)\b/, "bonus"],
  [/\b(priority|early access|exclusive)\b/, "priority"],
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s: unknown) => String(s ?? "").toLowerCase().trim();
const uniq = <T,>(arr: T[]): T[] => [...new Set(arr.filter(Boolean))];

/**
 * Read a reading-time bound out of free text.
 * Handles "under 5 minutes", "over 4 min", "3-5 min read", "quick read".
 */
function parseReadTime(text: string): { readMin: number | null; readMax: number | null } {
  const UNIT = String.raw`(?:min(?:ute)?s?)\b`;

  const range = text.match(new RegExp(`(\\d{1,3})\\s*(?:-|–|to)\\s*(\\d{1,3})\\s*${UNIT}`));
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    if (Number.isFinite(lo) && Number.isFinite(hi)) {
      return { readMin: Math.min(lo, hi), readMax: Math.max(lo, hi) };
    }
  }

  const under = text.match(
    new RegExp(`\\b(?:under|below|less\\s+than|max|up\\s+to)\\s*(\\d{1,3})(?:\\s*${UNIT})?`),
  );
  if (under) return { readMin: null, readMax: Number(under[1]) };

  const over = text.match(
    new RegExp(`\\b(?:over|above|more\\s+than|at\\s+least|min)\\s*(\\d{1,3})(?:\\s*${UNIT})?`),
  );
  if (over) return { readMin: Number(over[1]), readMax: null };

  if (/\b(quick|short|fast)\s+(?:read|reads)\b/.test(text)) return { readMin: null, readMax: 4 };
  if (/\b(long(?:er)?|deep|in-depth)\s+(?:read|reads)\b/.test(text)) return { readMin: 5, readMax: null };

  return { readMin: null, readMax: null };
}

/**
 * Turn one typed sentence into a filter set.
 *
 * @param raw     what the member typed
 * @param vocab   sponsor names and article tags present in the live content, so
 *                only facets that can actually match are created
 */
export function parseValueQuery(
  raw: string,
  vocab: { sponsors?: string[]; tags?: string[] } = {},
): ValueFilters {
  const text = String(raw ?? "").trim();
  const next: ValueFilters = { ...EMPTY_VALUE_FILTERS };
  if (!text) return next;

  const lower = text.toLowerCase();

  for (const [re, category] of CATEGORY_SYNONYMS) {
    if (re.test(lower)) next.categories = uniq([...next.categories, category]);
  }

  for (const [re, perk] of PERK_QUERY_RE) {
    if (re.test(lower)) next.perks = uniq([...next.perks, perk]);
  }

  for (const sponsor of vocab.sponsors ?? []) {
    const name = norm(sponsor);
    if (!name) continue;
    if (new RegExp(`\\b${escapeRe(name)}\\b`, "i").test(lower)) {
      next.sponsors = uniq([...next.sponsors, name]);
    }
  }

  for (const tag of vocab.tags ?? []) {
    const t = norm(tag);
    if (!t) continue;
    if (new RegExp(`\\b${escapeRe(t)}\\b`, "i").test(lower)) next.tags = uniq([...next.tags, t]);
  }

  const read = parseReadTime(lower);
  next.readMin = read.readMin;
  next.readMax = read.readMax;

  if (/\b(saved|bookmarked|shortlist(?:ed)?)\b/.test(lower)) next.savedOnly = true;

  const structured =
    next.categories.length ||
    next.perks.length ||
    next.sponsors.length ||
    next.tags.length ||
    next.readMin != null ||
    next.readMax != null ||
    next.savedOnly;

  // Keep the raw phrase for a soft text match only when no facet was inferred.
  next.text = structured ? "" : text;
  return next;
}

/** Every typed word must appear somewhere in the card's own copy. */
function textMatches(haystack: string, query: string): boolean {
  const words = norm(query).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return true;
  const hay = norm(haystack);
  return words.every((w) => hay.includes(w));
}

export function matchOffer(
  offer: BrandOffer,
  f: ValueFilters,
  isSaved: (id: string) => boolean = () => false,
): boolean {
  if (f.categories.length && !f.categories.includes(offer.category)) return false;
  if (f.perks.length && !f.perks.some((p) => PERK_BADGE_RE[p].test(offer.badge ?? ""))) return false;
  if (f.sponsors.length && !f.sponsors.includes(norm(offer.sponsor))) return false;
  if (f.savedOnly && !isSaved(offer.id)) return false;
  if (f.text) {
    const hay = [offer.title, offer.summary, offer.detail, offer.sponsor, offer.badge, OFFER_CATEGORY_LABELS[offer.category]].join(" ");
    if (!textMatches(hay, f.text)) return false;
  }
  return true;
}

export function matchPost(post: BlogPost, f: ValueFilters): boolean {
  if (f.tags.length && !f.tags.some((t) => post.tags.map(norm).includes(t))) return false;
  if (f.readMin != null && post.readMinutes < f.readMin) return false;
  if (f.readMax != null && post.readMinutes > f.readMax) return false;
  if (f.text) {
    const hay = [post.title, post.excerpt, post.body, post.author, post.tags.join(" ")].join(" ");
    if (!textMatches(hay, f.text)) return false;
  }
  return true;
}

/**
 * Flatten the applied filters into removable chips for the scope on screen.
 * Each chip knows how to remove itself, so a member can drop one facet at a
 * time instead of clearing the whole search.
 */
export function describeValueFilters(f: ValueFilters, scope: ValueScope): ValueChip[] {
  const chips: ValueChip[] = [];
  const push = (group: ValueChip["group"], value: string, label: string) =>
    chips.push({ id: `${group}:${value}`, group, value, label });

  if (scope === "offers") {
    for (const c of f.categories) push("categories", c, OFFER_CATEGORY_LABELS[c] ?? c);
    for (const p of f.perks) push("perks", p, PERK_LABELS[p]);
    for (const s of f.sponsors) push("sponsors", s, s.replace(/\b\w/g, (m) => m.toUpperCase()));
    if (f.savedOnly) push("savedOnly", "true", "Saved only");
  } else {
    for (const t of f.tags) push("tags", t, `#${t}`);
    if (f.readMin != null && f.readMax != null) push("read", "both", `${f.readMin}–${f.readMax} min read`);
    else if (f.readMax != null) push("read", "max", `Under ${f.readMax} min read`);
    else if (f.readMin != null) push("read", "min", `${f.readMin} min read or more`);
  }
  if (f.text) push("text", f.text, `“${f.text}”`);

  return chips;
}

/** Remove one chip from a filter set, returning a new set. */
export function removeValueFilter(f: ValueFilters, chip: ValueChip): ValueFilters {
  const next: ValueFilters = { ...f };
  switch (chip.group) {
    case "categories":
      next.categories = f.categories.filter((c) => c !== chip.value);
      break;
    case "perks":
      next.perks = f.perks.filter((p) => p !== chip.value);
      break;
    case "sponsors":
      next.sponsors = f.sponsors.filter((s) => s !== chip.value);
      break;
    case "tags":
      next.tags = f.tags.filter((t) => t !== chip.value);
      break;
    case "read":
      if (chip.value === "both" || chip.value === "min") next.readMin = null;
      if (chip.value === "both" || chip.value === "max") next.readMax = null;
      break;
    case "savedOnly":
      next.savedOnly = false;
      break;
    case "text":
      next.text = "";
      break;
  }
  return next;
}

export function offerSponsorVocab(offers: BrandOffer[]): string[] {
  return uniq(offers.map((o) => norm(o.sponsor)));
}

export function postTagVocab(posts: BlogPost[]): string[] {
  return uniq(posts.flatMap((p) => p.tags.map(norm)));
}

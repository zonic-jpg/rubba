/** Saved brand/advertiser links — localStorage pattern (same as Value Zone offers). */

export type SavedBrandLink = {
  id: string;
  title: string;
  url: string;
  sponsor: string;
  kind: "brand" | "offer";
  savedAt: string;
};

const KEY = "rubba_saved_brand_links";
const LEGACY_OFFERS_KEY = "rubba_saved_offers";

function readRaw(): SavedBrandLink[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedBrandLink[];
      if (Array.isArray(parsed)) return parsed.filter((x) => x && x.id && x.url);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function writeRaw(list: SavedBrandLink[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** Migrate legacy offer-id-only saves into the unified link store when possible. */
function migrateLegacyOfferIds(knownOffers?: { id: string; title: string; ctaUrl: string; sponsor: string }[]) {
  try {
    const legacy = localStorage.getItem(LEGACY_OFFERS_KEY);
    if (!legacy || !knownOffers?.length) return;
    const ids = JSON.parse(legacy) as string[];
    if (!Array.isArray(ids) || !ids.length) return;
    const cur = readRaw();
    const have = new Set(cur.map((x) => x.id));
    let changed = false;
    for (const id of ids) {
      if (have.has(id)) continue;
      const o = knownOffers.find((x) => x.id === id);
      if (!o?.ctaUrl) continue;
      cur.push({
        id: o.id,
        title: o.title,
        url: o.ctaUrl,
        sponsor: o.sponsor,
        kind: "offer",
        savedAt: new Date().toISOString(),
      });
      have.add(id);
      changed = true;
    }
    if (changed) writeRaw(cur);
  } catch {
    /* ignore */
  }
}

export function loadSavedBrandLinks(
  knownOffers?: { id: string; title: string; ctaUrl: string; sponsor: string }[],
): SavedBrandLink[] {
  migrateLegacyOfferIds(knownOffers);
  return readRaw();
}

export function isBrandLinkSaved(id: string): boolean {
  return readRaw().some((x) => x.id === id);
}

/** Toggle save. Returns true if now saved. */
export function toggleSavedBrandLink(
  link: Omit<SavedBrandLink, "savedAt">,
): boolean {
  const cur = readRaw();
  const idx = cur.findIndex((x) => x.id === link.id);
  if (idx >= 0) {
    cur.splice(idx, 1);
    writeRaw(cur);
    try {
      const legacy = localStorage.getItem(LEGACY_OFFERS_KEY);
      if (legacy) {
        const ids = (JSON.parse(legacy) as string[]).filter((id) => id !== link.id);
        localStorage.setItem(LEGACY_OFFERS_KEY, JSON.stringify(ids));
      }
    } catch {
      /* ignore */
    }
    return false;
  }
  cur.unshift({ ...link, savedAt: new Date().toISOString() });
  writeRaw(cur);
  if (link.kind === "offer") {
    try {
      const legacy = localStorage.getItem(LEGACY_OFFERS_KEY);
      const ids = legacy ? (JSON.parse(legacy) as string[]) : [];
      if (!ids.includes(link.id)) {
        localStorage.setItem(LEGACY_OFFERS_KEY, JSON.stringify([...ids, link.id]));
      }
    } catch {
      /* ignore */
    }
  }
  return true;
}

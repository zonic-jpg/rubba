/**
 * Royalty-free imagery (Unsplash License) — young Africans in education,
 * entrepreneurship, community, tech, and creative work.
 * Replace with owned photography in production if desired.
 */

const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export type PageImageKey =
  | "hero"
  | "landingStrip"
  | "profile"
  | "inspiration"
  | "plans"
  | "roadmap"
  | "auth"
  | "billing"
  | "community";

export const PAGE_IMAGES: Record<
  PageImageKey,
  { src: string; alt: string; credit: string }
> = {
  hero: {
    src: u("photo-1617137968427-85924c800a22"),
    alt: "African fashion creatives preparing looks in a Lagos studio",
    credit: "Unsplash — African fashion editorial",
  },
  landingStrip: {
    src: u("photo-1591604466374-42e045186142", 800),
    alt: "Nigerian celebration with family and friends in traditional dress",
    credit: "Unsplash — Owanbe-style gathering",
  },
  profile: {
    src: u("photo-1515378791036-0648a3ef77b2", 1200),
    alt: "Young African woman planning her next financial milestone",
    credit: "Unsplash — Christina @ wocintechchat.com",
  },
  inspiration: {
    src: u("photo-1578926375605-e079955877e9", 1200),
    alt: "Friends celebrating progress at an African art gallery opening",
    credit: "Unsplash — African creative community",
  },
  plans: {
    src: u("photo-1529156069898-b83521416738", 1200),
    alt: "Nigerian founders reviewing plans on a whiteboard in Lagos",
    credit: "Unsplash — African startup team",
  },
  roadmap: {
    src: u("photo-1500648767791-00dcc994a43e", 1200),
    alt: "Young African startup team building something together",
    credit: "Unsplash — Christina @ wocintechchat.com",
  },
  auth: {
    src: u("photo-1617137968427-85924c800a22", 900),
    alt: "Young African creatives collaborating around a laptop",
    credit: "Unsplash — African fashion studio",
  },
  billing: {
    src: u("photo-1520975916090-3105956dac38", 900),
    alt: "Confident young African entrepreneur ready to invest in her future",
    credit: "Unsplash — Christina @ wocintechchat.com",
  },
  community: {
    src: u("photo-1561214115-fbc4f7856548", 1200),
    alt: "Young people learning together beside African art and craft",
    credit: "Unsplash — African cultural heritage",
  },
};

/** Persona card portraits — mapped by persona id in seed data */
export const PERSONA_IMAGES: Record<string, { src: string; alt: string }> = {
  p1: {
    src: u("photo-1515378791036-0648a3ef77b2", 600),
    alt: "Young Nigerian professional in business attire",
  },
  p2: {
    src: u("photo-1591604466374-42e045186142", 600),
    alt: "Young African couple planning their family future",
  },
  p3: {
    src: u("photo-1500648767791-00dcc994a43e", 600),
    alt: "Young Nigerian entrepreneur in her workspace",
  },
  p4: {
    src: u("photo-1529156069898-b83521416738", 600),
    alt: "African engineer reviewing plans at his desk",
  },
  p5: {
    src: u("photo-1520975916090-3105956dac38", 600),
    alt: "Determined young African woman focused on her goals",
  },
  p6: {
    src: u("photo-1578926375605-e079955877e9", 600),
    alt: "African couple reviewing property investment options",
  },
};

/** Mosaic tiles for the landing “real stories” band */
export const LANDING_MOSAIC = [
  PAGE_IMAGES.landingStrip,
  {
    src: u("photo-1617137968427-85924c800a22", 600),
    alt: "Young African team in a strategy meeting",
    credit: "Unsplash — African fashion studio",
  },
  {
    src: u("photo-1561214115-fbc4f7856548", 600),
    alt: "Young African students studying together beside heritage art",
    credit: "Unsplash — African cultural learning",
  },
] as const;

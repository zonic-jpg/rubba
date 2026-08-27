/**
 * Page imagery — bundled African photography + verified Unsplash where live.
 * Local assets in /public avoid mislabeled or 404 Unsplash IDs.
 */

const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const LOCAL_HERO = "/hero-african.jpg";

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
    src: LOCAL_HERO,
    alt: "Nigerian celebration — woman in Ankara gele at an Owanbe",
    credit: "Zonic — OwanbeX celebration photography",
  },
  landingStrip: {
    src: LOCAL_HERO,
    alt: "Nigerian celebration with family and friends in traditional dress",
    credit: "Zonic — OwanbeX celebration photography",
  },
  profile: {
    src: LOCAL_HERO,
    alt: "Young African woman planning her next financial milestone",
    credit: "Zonic — OwanbeX celebration photography",
  },
  inspiration: {
    src: LOCAL_HERO,
    alt: "Friends celebrating progress at an African art gallery opening",
    credit: "Zonic — OwanbeX celebration photography",
  },
  plans: {
    src: LOCAL_HERO,
    alt: "Nigerian founders reviewing plans on a whiteboard in Lagos",
    credit: "Zonic — OwanbeX celebration photography",
  },
  roadmap: {
    src: LOCAL_HERO,
    alt: "Young African startup team building something together",
    credit: "Zonic — OwanbeX celebration photography",
  },
  auth: {
    src: LOCAL_HERO,
    alt: "Young African creatives collaborating around a laptop",
    credit: "Zonic — OwanbeX celebration photography",
  },
  billing: {
    src: u("photo-1520975916090-3105956dac38", 900),
    alt: "Confident young African entrepreneur ready to invest in her future",
    credit: "Unsplash — editorial portrait",
  },
  community: {
    src: LOCAL_HERO,
    alt: "Young people learning together beside African art and craft",
    credit: "Zonic — OwanbeX celebration photography",
  },
};

/** Persona card portraits — mapped by persona id in seed data */
export const PERSONA_IMAGES: Record<string, { src: string; alt: string }> = {
  p1: { src: LOCAL_HERO, alt: "Young Nigerian professional in business attire" },
  p2: { src: LOCAL_HERO, alt: "Young African couple planning their family future" },
  p3: { src: LOCAL_HERO, alt: "Young Nigerian entrepreneur in her workspace" },
  p4: { src: LOCAL_HERO, alt: "African engineer reviewing plans at his desk" },
  p5: { src: LOCAL_HERO, alt: "Determined young African woman focused on her goals" },
  p6: { src: LOCAL_HERO, alt: "African couple reviewing property investment options" },
};

/** Mosaic tiles for the landing “real stories” band */
export const LANDING_MOSAIC = [
  PAGE_IMAGES.landingStrip,
  {
    src: LOCAL_HERO,
    alt: "Young African team in a strategy meeting",
    credit: "Zonic — OwanbeX celebration photography",
  },
  {
    src: LOCAL_HERO,
    alt: "Young African students studying together beside heritage art",
    credit: "Zonic — OwanbeX celebration photography",
  },
] as const;

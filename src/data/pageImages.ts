/**
 * Royalty-free imagery (Unsplash License) — young Africans in education,
 * entrepreneurship, community, tech, and creative work.
 * Replace with owned photography in production if desired.
 *
 * Sources:
 * - unsplash.com/photos (various photographers; see alt text per image)
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
    src: u("photo-1521737604893-d14cc237f11d"),
    alt: "Young African students collaborating on laptops",
    credit: "Unsplash — LinkedIn Sales Navigator",
  },
  landingStrip: {
    src: u("photo-1515378791036-0648a3ef77b2", 800),
    alt: "Young African professional at work",
    credit: "Unsplash — Christina @ wocintechchat.com",
  },
  profile: {
    src: u("photo-1520975916090-3105956dac38", 1200),
    alt: "Young African woman planning her next move",
    credit: "Unsplash — LinkedIn Sales Navigator",
  },
  inspiration: {
    src: u("photo-1524504388940-b1c1722653e1", 1200),
    alt: "Friends celebrating a shared milestone in their community",
    credit: "Unsplash — Helena Lopes",
  },
  plans: {
    src: u("photo-1515378791036-0648a3ef77b2", 1200),
    alt: "African founders reviewing plans on a whiteboard",
    credit: "Unsplash — Jason Goodman",
  },
  roadmap: {
    src: u("photo-1500648767791-00dcc994a43e", 1200),
    alt: "Young African startup team building something together",
    credit: "Unsplash — Christina @ wocintechchat.com",
  },
  auth: {
    src: u("photo-1500648767791-00dcc994a43e", 900),
    alt: "Young African creatives collaborating around a laptop",
    credit: "Unsplash — Product School",
  },
  billing: {
    src: u("photo-1520975916090-3105956dac38", 900),
    alt: "Confident young African entrepreneur ready to invest in her future",
    credit: "Unsplash — Christina @ wocintechchat.com",
  },
  community: {
    src: u("photo-1524504388940-b1c1722653e1", 1200),
    alt: "Young people learning together in an African classroom",
    credit: "Unsplash — NeONBRAND",
  },
};

/** Persona card portraits — mapped by persona id in seed data */
export const PERSONA_IMAGES: Record<string, { src: string; alt: string }> = {
  p1: {
    src: u("photo-1515378791036-0648a3ef77b2", 600),
    alt: "Young Nigerian professional in business attire",
  },
  p2: {
    src: u("photo-1520975916090-3105956dac38", 600),
    alt: "Young African couple planning their family future",
  },
  p3: {
    src: u("photo-1500648767791-00dcc994a43e", 600),
    alt: "Young Nigerian entrepreneur in her workspace",
  },
  p4: {
    src: u("photo-1524504388940-b1c1722653e1", 600),
    alt: "African engineer reviewing plans at his desk",
  },
  p5: {
    src: u("photo-1520975916090-3105956dac38", 600),
    alt: "Determined young African woman focused on her goals",
  },
  p6: {
    src: u("photo-1524504388940-b1c1722653e1", 600),
    alt: "African couple reviewing property investment options",
  },
};

/** Mosaic tiles for the landing “real stories” band */
export const LANDING_MOSAIC = [
  PAGE_IMAGES.landingStrip,
  {
    src: u("photo-1521737604893-d14cc237f11d", 600),
    alt: "Young African team in a strategy meeting",
    credit: "Unsplash — Campaign Creators",
  },
  {
    src: u("photo-1515378791036-0648a3ef77b2", 600),
    alt: "Young African students studying together",
    credit: "Unsplash — Alexis Brown",
  },
] as const;

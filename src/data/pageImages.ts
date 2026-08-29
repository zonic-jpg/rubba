/**
 * Page imagery — varied Nigerian / West-African youth photography.
 * Local assets in /public/youth (Zonic creative library) + celebration hero.
 */

const y = (file: string) => `/youth/${file}`;

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
    src: y("day-portrait.jpg"),
    alt: "Young Nigerian woman in Ankara dress — confident, future-facing",
    credit: "Zonic — Nigerian youth creative library",
  },
  landingStrip: {
    src: y("runway-energy.jpg"),
    alt: "Young Nigerian models on a fashion runway in modern traditional dress",
    credit: "Zonic — Nigerian youth creative library",
  },
  profile: {
    src: y("studio-creatives.jpg"),
    alt: "Young West-African creative smiling in a bright plant-filled space",
    credit: "Zonic — Nigerian youth creative library",
  },
  inspiration: {
    src: y("brand-builders.jpg"),
    alt: "Young Nigerian entrepreneur in a Lagos fashion boutique",
    credit: "Zonic — Nigerian youth creative library",
  },
  plans: {
    src: y("plan-your-look.jpg"),
    alt: "Young Nigerian planner styling the week ahead",
    credit: "Zonic — Nigerian youth creative library",
  },
  roadmap: {
    src: y("social-reels.jpg"),
    alt: "Young Nigerian man capturing creative work on his phone",
    credit: "Zonic — Nigerian youth creative library",
  },
  auth: {
    src: y("campus-style.jpg"),
    alt: "Young Nigerian adults with campus and street style energy",
    credit: "Zonic — Nigerian youth creative library",
  },
  billing: {
    src: y("wardrobe-goals.jpg"),
    alt: "Young Nigerian adult investing in their next chapter",
    credit: "Zonic — Nigerian youth creative library",
  },
  community: {
    src: y("owanbe-celebration.jpg"),
    alt: "Nigerian celebration — young adults at an Owanbe in traditional dress",
    credit: "Zonic — OwanbeX celebration photography",
  },
};

/** Persona card portraits — distinct faces/scenes per persona */
export const PERSONA_IMAGES: Record<string, { src: string; alt: string }> = {
  p1: { src: y("brand-builders.jpg"), alt: "Young Nigerian professional building his brand" },
  p2: { src: y("runway-energy.jpg"), alt: "Young Nigerian couple energy — celebration and ambition" },
  p3: { src: y("day-portrait.jpg"), alt: "Young Nigerian entrepreneur in vibrant Ankara" },
  p4: { src: y("social-reels.jpg"), alt: "Young Nigerian engineer / creative with a plan" },
  p5: { src: y("friends-week.jpg"), alt: "Determined young Nigerian woman focused on her goals" },
  p6: { src: y("studio-creatives.jpg"), alt: "Young African pair energy — home and future planning" },
};

/** Mosaic tiles for the landing “real stories” band — varied scenes */
export const LANDING_MOSAIC = [
  {
    src: y("day-portrait.jpg"),
    alt: "Young Nigerian woman ready for her next milestone",
    credit: "Zonic — Nigerian youth creative library",
  },
  {
    src: y("brand-builders.jpg"),
    alt: "Young Nigerian founder in his creative workspace",
    credit: "Zonic — Nigerian youth creative library",
  },
  {
    src: y("runway-energy.jpg"),
    alt: "Young Nigerian creatives owning the runway",
    credit: "Zonic — Nigerian youth creative library",
  },
] as const;

/** Extra offer/blog art so seed cards aren’t one repeated face */
export const OFFER_IMAGES = {
  courses: y("social-reels.jpg"),
  mobility: y("campus-style.jpg"),
  education: y("studio-creatives.jpg"),
  career: y("brand-builders.jpg"),
  finance: y("plan-your-look.jpg"),
  lifestyle: y("day-portrait.jpg"),
  health: y("friends-week.jpg"),
  housing: y("wardrobe-goals.jpg"),
  blog1: y("photo-crew.jpg"),
  blog2: y("owanbe-celebration.jpg"),
  blog3: y("runway-energy.jpg"),
} as const;

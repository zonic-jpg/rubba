export type BrandCategory =
  | "savings"
  | "home"
  | "car"
  | "education"
  | "family"
  | "business"
  | "insurance"
  | "travel"
  | "retirement";

/** Value Zone offer categories — used for advertising segmentation */
export type OfferCategory =
  | "education"
  | "mobility"
  | "courses"
  | "finance"
  | "lifestyle"
  | "career"
  | "health"
  | "housing";

export const OFFER_CATEGORIES: OfferCategory[] = [
  "education",
  "mobility",
  "courses",
  "finance",
  "lifestyle",
  "career",
  "health",
  "housing",
];

export const OFFER_CATEGORY_LABELS: Record<OfferCategory, string> = {
  education: "Education",
  mobility: "Mobility",
  courses: "Courses",
  finance: "Finance",
  lifestyle: "Lifestyle",
  career: "Career",
  health: "Health",
  housing: "Housing",
};

/** A vibrant brand offer surfaced in the Value Zone for Rubba members */
export type BrandOffer = {
  id: string;
  category: OfferCategory;
  title: string;
  summary: string;
  detail: string;
  image: string;
  emoji: string;
  ctaLabel: string;
  ctaUrl: string;
  sponsor: string;
  badge?: string;
  sort: number;
  active: boolean;
  source: "mock" | "live";
};

/** Aspirational community article inside the Value Zone */
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  image: string;
  tags: string[];
  readMinutes: number;
  publishedAt: string;
  sort: number;
  active: boolean;
  source: "mock" | "live";
};

export type Goal = { id: string; label: string; col: string };

export type PersonaMilestone = { age: number; label: string; icon: string };

export type Persona = {
  id: string;
  name: string;
  kind: "real" | "composite";
  city: string;
  achievedAge: number;
  av: string;
  goals: string[];
  text: string;
  tags: string[];
  milestones: PersonaMilestone[];
};

export type Pathway = { id: string; t: string; d: string; y: string; c: string };

export type BrandCard = {
  id: string;
  category: BrandCategory;
  title: string;
  subtitle: string;
  logoEmoji: string;
  logoUrl?: string | null;
  ctaLabel: string;
  ctaUrl: string;
  sponsor: string;
  sort: number;
  active: boolean;
};

export type PaidTier = {
  id: string;
  name: string;
  generationsPerMonth: number;
  priceNgn: number;
  priceUsd: number;
  description: string;
  highlight?: boolean;
  stripePriceId?: string;
};

export type PaymentGateway = "mock" | "paystack" | "flutterwave" | "stripe";

export type AppSettings = {
  freeGenerationsPerMonth: number;
  defaultGateway: PaymentGateway;
  mockPaymentsEnabled: boolean;
  paystackPublicKey: string;
  flutterwavePublicKey: string;
  stripePublishableKey: string;
  messaging: {
    heroEyebrow: string;
    heroTitle: string;
    heroLead: string;
    antiHype: string;
    tierIntro: string;
    limitReached: string;
    brandIntro: string;
    trackingIntro: string;
  };
};

export type FooterPages = {
  faqs: { q: string; a: string }[];
  privacy: string;
  contact: string;
};

export type Profile = {
  age: number;
  income: number;
  savings: number;
  dependants: number;
  city: string;
  target: number;
  /** Optional, privacy-minded fields — improve roadmap & Value Zone relevance.
   *  Anonymized (age → band, no exact DOB) before any analytics leaves the device. */
  occupation?: string;
  interests?: string[];
  employmentStatus?: string;
};

export type Checkpoint = { age: number; h: string; p: string; cls?: "" | "t" | "g" };

export type PlanStep = {
  id: string;
  label: string;
  category: BrandCategory;
  targetAge?: number;
  done?: boolean;
};

export type Roadmap = {
  headline: string;
  intro: string;
  score: number;
  monthly: number;
  years: number;
  checkpoints: Checkpoint[];
  steps: PlanStep[];
  pathways: Pathway[];
};

export type UserUsage = {
  userId: string;
  cycleKey: string;
  used: number;
  tierId: string;
  bonusGenerations: number;
};

export type SiteContent = {
  brand: { name: string; logoImage: string | null };
  settings: AppSettings;
  tiers: PaidTier[];
  goals: Goal[];
  dreams: string[];
  cities: string[];
  personas: Persona[];
  pathways: Pathway[];
  brands: BrandCard[];
  offers: BrandOffer[];
  blog: BlogPost[];
  pages: FooterPages;
  monetization: MonetizationGates;
};

export type PostAllowanceBehavior = "soft_prompt" | "hard_block" | "read_only";

export type BrandPlacementType = "offer_listing" | "featured_journey" | "sponsored_strip";

export const BRAND_PLACEMENT_LABELS: Record<BrandPlacementType, string> = {
  offer_listing: "Value Zone offer listing",
  featured_journey: "Featured journey placement",
  sponsored_strip: "Sponsored brand strip",
};

export type UserGate = {
  active: boolean;
  planName: string;
  priceLabel: string;
  freeAllowance: number;
  postAllowanceBehavior: PostAllowanceBehavior;
};

export type BrandGate = {
  active: boolean;
  placementTypes: BrandPlacementType[];
  pricePackage: string;
  freeTrialSlots: number;
};

export type MonetizationGates = {
  userGate: UserGate;
  brandGate: BrandGate;
};

export type PaymentInitResult = {
  ok: boolean;
  gateway: PaymentGateway;
  authorizationUrl?: string;
  reference?: string;
  message?: string;
};

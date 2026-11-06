/**
 * Demonstration content for the TASK-004 experience layer.
 *
 * Every record here is FICTIONAL and clearly labelled as such in the UI. This
 * module exists so the interface can be reviewed with realistic structure
 * before the content/identity tasks persist real data:
 *
 * - No real personal data (no emails, phone numbers, addresses or photos).
 * - No verification badges, no transaction amounts, no private messages.
 * - Nothing here is served from a database, and nothing claims to be.
 *
 * When TASK-007A/007B land, this module is replaced by server-fetched data and
 * the `isDemo` contract below should disappear with it.
 */

export const DEMO_DISCLOSURE =
  "Demonstration content: every profile, post, community and listing in this build is a fictional example, not a real SYNERGY member.";

export type DemoAuthorKind = "individual" | "creator" | "business";

export interface DemoAuthor {
  handle: string;
  displayName: string;
  kind: DemoAuthorKind;
  category: string;
  location: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  joinedLabel: string;
  /** Short capability chips shown on the profile. */
  capabilities: string[];
}

/** Six fictional accounts covering individual, creator and business kinds. */
export const DEMO_AUTHORS: DemoAuthor[] = [
  {
    handle: "amara.makes",
    displayName: "Amara O.",
    kind: "creator",
    category: "Tailoring & fashion",
    location: "Bodija, Ibadan",
    bio: "Made-to-measure tailoring for everyday wear and events. Small studio, two machines, honest timelines.",
    followers: 1284,
    following: 187,
    posts: 64,
    joinedLabel: "Founding build",
    capabilities: ["Tailoring", "Fabric sourcing", "Alterations"],
  },
  {
    handle: "tunde.frames",
    displayName: "Tunde A.",
    kind: "creator",
    category: "Photography",
    location: "Ring Road, Ibadan",
    bio: "Portrait and event photography. Documenting everyday Ibadan — markets, streets, people at work.",
    followers: 2410,
    following: 320,
    posts: 112,
    joinedLabel: "Founding build",
    capabilities: ["Portraits", "Events", "Photo walks"],
  },
  {
    handle: "bola.homefix",
    displayName: "Bola Homefix",
    kind: "business",
    category: "Home repairs",
    location: "Ibadan, city-wide",
    bio: "Two-person team handling plumbing, small electrical fixes and fittings. Clear quotes before any work starts.",
    followers: 412,
    following: 44,
    posts: 28,
    joinedLabel: "Founding build",
    capabilities: ["Plumbing", "Fittings", "Emergency call-outs"],
  },
  {
    handle: "ibadan.creators",
    displayName: "Ibadan Creators Circle",
    kind: "individual",
    category: "Community organiser",
    location: "Dugbe, Ibadan",
    bio: "Organises a monthly meet-up for designers, writers and photographers working in and around Ibadan.",
    followers: 876,
    following: 132,
    posts: 41,
    joinedLabel: "Founding build",
    capabilities: ["Meet-ups", "Mentoring", "Collaboration"],
  },
  {
    handle: "yemi.pantry",
    displayName: "Yemi's Pantry",
    kind: "business",
    category: "Food & provisions",
    location: "Akobo, Ibadan",
    bio: "Small-batch plantain chips and spice blends, packed the same week they are made. Pickup and local delivery.",
    followers: 631,
    following: 58,
    posts: 53,
    joinedLabel: "Founding build",
    capabilities: ["Small-batch food", "Local delivery", "Wholesale"],
  },
  {
    handle: "ada.designs",
    displayName: "Ada N.",
    kind: "creator",
    category: "Brand & product design",
    location: "Jericho, Ibadan",
    bio: "Designs identities and packaging for small Nigerian businesses. Prefers working with makers who sell locally first.",
    followers: 1590,
    following: 240,
    posts: 37,
    joinedLabel: "Founding build",
    capabilities: ["Brand identity", "Packaging", "Design systems"],
  },
];

export type FeedCategory =
  "all" | "local" | "creators" | "communities" | "marketplace";

export interface DemoMediaPreview {
  kind: "image" | "video";
  label: string;
  aspect: "square" | "video" | "wide";
  durationLabel?: string;
}

export interface DemoPost {
  id: string;
  authorHandle: string;
  timeLabel: string;
  category: Exclude<FeedCategory, "all">;
  body: string;
  media?: DemoMediaPreview;
  likes: number;
  comments: number;
  shares: number;
  /** Sponsored placement is deliberately absent; the layout must allow it later. */
  placement: "organic";
}

export const DEMO_POSTS: DemoPost[] = [
  {
    id: "post-001",
    authorHandle: "amara.makes",
    timeLabel: "2h",
    category: "creators",
    body: "Finished a set of three work shirts for a customer in Bodija. Same fabric weight, different collars — small differences matter when you wear them weekly.",
    media: {
      kind: "image",
      label: "Three work shirts on a rail",
      aspect: "wide",
    },
    likes: 148,
    comments: 22,
    shares: 9,
    placement: "organic",
  },
  {
    id: "post-002",
    authorHandle: "tunde.frames",
    timeLabel: "4h",
    category: "local",
    body: "Morning light at Bodija market. The traders arrive before six; the good frames happen in the first hour.",
    media: {
      kind: "image",
      label: "Market stalls in early morning light",
      aspect: "square",
    },
    likes: 306,
    comments: 41,
    shares: 27,
    placement: "organic",
  },
  {
    id: "post-003",
    authorHandle: "bola.homefix",
    timeLabel: "6h",
    category: "marketplace",
    body: "A leaking kitchen tap turned out to be a worn washer and a loose joint. Fixed in under an hour, quoted before starting. Two more call-outs open this week.",
    likes: 54,
    comments: 12,
    shares: 4,
    placement: "organic",
  },
  {
    id: "post-004",
    authorHandle: "ibadan.creators",
    timeLabel: "8h",
    category: "communities",
    body: "Next meet-up: Saturday, 10am, Dugbe. Three short talks — pricing creative work, photographing products on a phone, and keeping a client for years. Free to attend, 40 seats.",
    media: {
      kind: "video",
      label: "Last month's meet-up, 48 seconds",
      aspect: "video",
      durationLabel: "0:48",
    },
    likes: 219,
    comments: 63,
    shares: 38,
    placement: "organic",
  },
  {
    id: "post-005",
    authorHandle: "yemi.pantry",
    timeLabel: "11h",
    category: "marketplace",
    body: "This week's plantain chips are packed and ready. Same recipe, slightly thinner cut — easier to eat on the go. Pickup from Akobo or delivery within Ibadan.",
    media: {
      kind: "image",
      label: "Packed plantain chips on a worktop",
      aspect: "square",
    },
    likes: 92,
    comments: 18,
    shares: 11,
    placement: "organic",
  },
  {
    id: "post-006",
    authorHandle: "ada.designs",
    timeLabel: "1d",
    category: "creators",
    body: "Packaging review for a small spice seller: three labels, one shelf, two seconds to be understood. We removed the pattern and let the type do the work.",
    media: {
      kind: "image",
      label: "Three packaging label variants",
      aspect: "wide",
    },
    likes: 174,
    comments: 29,
    shares: 16,
    placement: "organic",
  },
  {
    id: "post-007",
    authorHandle: "tunde.frames",
    timeLabel: "1d",
    category: "local",
    body: "Anyone in Ibadan shooting on older glass? I have a 50mm that renders skin tones beautifully and refuses to autofocus in low light. Trade notes?",
    likes: 67,
    comments: 24,
    shares: 3,
    placement: "organic",
  },
];

export type CommunityVisibility = "public" | "private";

export interface DemoCommunity {
  slug: string;
  name: string;
  topic: string;
  description: string;
  visibility: CommunityVisibility;
  members: number;
  postsThisWeek: number;
}

export const DEMO_COMMUNITIES: DemoCommunity[] = [
  {
    slug: "ibadan-creators",
    name: "Ibadan Creators Circle",
    topic: "Design, photography, writing",
    description:
      "A working group for people making things in Ibadan: monthly meet-ups, honest critique and paid-work leads.",
    visibility: "public",
    members: 876,
    postsThisWeek: 34,
  },
  {
    slug: "bodija-traders",
    name: "Bodija Traders",
    topic: "Market & small business",
    description:
      "For traders and shop owners around Bodija: pricing, stock, transport and safety updates. Verified sellers only, requests reviewed.",
    visibility: "private",
    members: 412,
    postsThisWeek: 19,
  },
  {
    slug: "ibadan-tech",
    name: "Ibadan Tech Circle",
    topic: "Software & hardware",
    description:
      "Builders in and around Ibadan sharing what they are shipping, asking for feedback and hiring locally.",
    visibility: "public",
    members: 1204,
    postsThisWeek: 58,
  },
  {
    slug: "home-repairs-network",
    name: "Home Repairs Network",
    topic: "Trades & services",
    description:
      "Plumbers, electricians, carpenters and painters trading referrals across Ibadan. Quote transparency is the one rule.",
    visibility: "public",
    members: 298,
    postsThisWeek: 12,
  },
];

export interface DemoVideo {
  id: string;
  title: string;
  authorHandle: string;
  durationLabel: string;
  viewsLabel: string;
  topic: string;
}

export const DEMO_VIDEOS: DemoVideo[] = [
  {
    id: "video-001",
    title: "Pricing creative work when the client is local",
    authorHandle: "ada.designs",
    durationLabel: "6:12",
    viewsLabel: "1.2k views",
    topic: "Creators",
  },
  {
    id: "video-002",
    title: "A morning at Bodija market, in five frames",
    authorHandle: "tunde.frames",
    durationLabel: "2:40",
    viewsLabel: "846 views",
    topic: "Local",
  },
  {
    id: "video-003",
    title: "Fixing a leaking kitchen tap, start to finish",
    authorHandle: "bola.homefix",
    durationLabel: "9:05",
    viewsLabel: "512 views",
    topic: "Services",
  },
  {
    id: "video-004",
    title: "Three work shirts, three collars",
    authorHandle: "amara.makes",
    durationLabel: "3:18",
    viewsLabel: "397 views",
    topic: "Craft",
  },
];

export interface DemoListing {
  id: string;
  title: string;
  providerHandle: string;
  type: "service" | "product";
  priceNote: string;
  area: string;
  summary: string;
}

export const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "listing-001",
    title: "Made-to-measure work shirts",
    providerHandle: "amara.makes",
    type: "service",
    priceNote: "From ₦18,000",
    area: "Bodija · pickup",
    summary: "Measured once, two fittings, four-week turnaround.",
  },
  {
    id: "listing-002",
    title: "Half-day portrait session",
    providerHandle: "tunde.frames",
    type: "service",
    priceNote: "From ₦45,000",
    area: "Ibadan · on location",
    summary: "Two hours, one location, 40 edited frames.",
  },
  {
    id: "listing-003",
    title: "Plantain chips, 500g packs",
    providerHandle: "yemi.pantry",
    type: "product",
    priceNote: "₦2,500 per pack",
    area: "Akobo · delivery",
    summary: "Packed the same week, thin cut, mild spice.",
  },
  {
    id: "listing-004",
    title: "Plumbing call-out & repairs",
    providerHandle: "bola.homefix",
    type: "service",
    priceNote: "Quote before work",
    area: "Ibadan · city-wide",
    summary: "Leaks, fittings and small replacements.",
  },
];

export function getAuthor(handle: string): DemoAuthor | undefined {
  return DEMO_AUTHORS.find((author) => author.handle === handle);
}

export function getCommunity(slug: string): DemoCommunity | undefined {
  return DEMO_COMMUNITIES.find((community) => community.slug === slug);
}

/** Compact counts (1250 → 1.3k) — display only, never a metric claim. */
export function formatCount(value: number): string {
  if (value < 1000) {
    return String(value);
  }
  const thousands = value / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1)}k`;
}

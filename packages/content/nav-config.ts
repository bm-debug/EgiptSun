/**
 * Shared nav config for navbar and footer.
 * Link labels use slug from URL (this file); group titles come from locales (footer.groups).
 */

/** Slug for display: path without leading slash; "/" → "home". Hyphens → spaces, first letter of each word capitalized. */
export function slugFromRoute(href: string): string {
  const raw = href === "/" ? "home" : href.replace(/^\//, "");
  return raw
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export const pageRoutes: Record<string, string> = {
  home: "/",
  about_us: "/about",
  services: "/services",
  catalog: "/catalog",
  projects: "/projects",
  team: "/team",
  blog: "/blog",
  news: "/news",
  vendors: "/vendors",
  ads: "/ads",
  events: "/events",
  objects: "/objects",
  legal: "/legal",
  knowledge_base: "/knowledge-base",
  jobs: "/jobs",
  testimonials: "/testimonials",
  prices: "/prices",
  wholesale: "/wholesale",
  history: "/history",
  locations: "/locations",
  investors: "/investors",
  tenders: "/tenders",
  certificates: "/certificates",
  press: "/press",
  csr: "/csr",
  faq: "/faq",
  promotions: "/promotions",
  loyalty_program: "/loyalty-program",
  affiliate_program: "/affiliate-program",
  franchise: "/franchise",
  gallery: "/gallery",
  video: "/video",
  appointment: "/appointment",
  contacts: "/contact",
  search: "/search",
  cart: "/cart",
  checkout: "/checkout",
  compare: "/compare",
  wishlist: "/wishlist",
  sitemap: "/sitemap",
  sign_in: "/sign-in",
  sign_up: "/sign-up",
  email_confirmation: "/email-confirmation",
  password_recovery: "/password-recovery",
  under_construction: "/under-construction",
  coming_soon: "/coming-soon",
  system_status: "/system-status",
  unsubscribe: "/unsubscribe",
  thank_you: "/thank-you",
};

export type NavGroupKey = "main" | "Products" | "Technical";

export const pageGroups: { key: NavGroupKey; pages: string[] }[] = [
  {
    key: "main",
    pages: [
      "home",
      "about_us",
      "blog",
      "news",
      "knowledge_base",
      "team",
      "history",
      "locations",
      "investors",
      "tenders",
      "certificates",
      "press",
      "csr",
      "jobs",
      "vendors",
      "ads",
      "events",
      "objects",
      "appointment",
    ],
  },
  {
    key: "Products",
    pages: [
      "services",
      "catalog",
      "projects",
      "prices",
      "wholesale",
      "promotions",
      "loyalty_program",
      "affiliate_program",
      "franchise",
      "testimonials",
      "gallery",
      "video",
      "cart",
      "checkout",
      "compare",
      "wishlist",
    ],
  },
  {
    key: "Technical",
    pages: [
      "search",
      "sitemap",
      "sign_in",
      "sign_up",
      "email_confirmation",
      "password_recovery",
      "under_construction",
      "coming_soon",
      "system_status",
      "unsubscribe",
      "thank_you",
    ],
  },
];

export const socialLinks = [
  { id: "linkedin" as const, label: "LinkedIn", href: "#" },
  { id: "twitter" as const, label: "Twitter", href: "#" },
  { id: "facebook" as const, label: "Facebook", href: "#" },
];

// Placeholder news content for the v2 canvas, taken from the "news-listing-page"
// and "news-article-detail" Figma frames. Shared by the listing and the detail
// route; replaced by news_post once v2 reads from the database.

export type Category = "Processes" | "Guidelines" | "Scripts" | "Copyright" | "Promotions";

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: Category;
  /** Short form for the listing cards. */
  date: string;
  /** Long form for the article header. */
  dateLong: string;
  author: string;
  /** Only the review-links article has structured body content in the frame. */
  links?: { label: string; href: string }[];
  /**
   * Sidebar tags. Only the review-links article has them drawn in the frame;
   * the rest fall back to their category so the card is never empty.
   */
  tags?: string[];
};

// Each category carries its own pill colour in the frame.
export const CATEGORY_PILL: Record<Category, string> = {
  Processes: "bg-[#8fb0a7]/[0.12] text-[#8fb0a7]",
  Guidelines: "bg-[#38bdf8]/[0.12] text-[#38bdf8]",
  Scripts: "bg-[#f59e0b]/[0.12] text-[#f59e0b]",
  Copyright: "bg-[#c084fc]/[0.12] text-[#c084fc]",
  Promotions: "bg-[#f472b6]/[0.12] text-[#f472b6]",
};

export const CATEGORIES: Category[] = [
  "Processes",
  "Guidelines",
  "Scripts",
  "Copyright",
  "Promotions",
];

export const ARTICLES: Article[] = [
  {
    slug: "gravel-host-review-links",
    title: "Gravel Host Review Links",
    excerpt:
      "Gravel Host: https://g2.com, Trust Pilot, Host Advice and Google review links for the hosting company to share with clients for quality assurance.",
    category: "Processes",
    date: "Aug 12, 2026",
    dateLong: "August 12, 2026",
    author: "Angeline",
    links: [
      {
        label: "Gravel Host:",
        href: "https://www.g2.com/products/gravel-host/reviews#reviews",
      },
      { label: "Trust Pilot:", href: "https://ca.trustpilot.com/review/gravelhost.com" },
      {
        label: "Host Advice:",
        href: "https://hostadvice.com/hosting-company/gravel-host-reviews/",
      },
      {
        label: "Google:",
        href: "https://www.google.com/maps/place/Gravel+Host/@25.7525454,-80.3077943,12z/data=!4m6!3m5!1s0x88d9b97fa5ad05fa:0x48d03c55ffaf5ad0!8m2!3d25.7525454!4d-80.2253934!16s%2Fg%2F11sbj_lv69?entry=tts&g_ep=EgoyMDYyMDgxMC40WhIKDSoASAFQAw%3D%3D",
      },
    ],
    tags: ["processes", "reviews", "links", "hosting"],
  },
  {
    slug: "security-verification-requirements",
    title: "Security Verification Requirements",
    excerpt:
      "For Gravel Host Compliance: Email Address, Identity, Full Address Region, Postcode, Country are required to complete level-2 support validation.",
    category: "Guidelines",
    date: "Aug 12, 2026",
    dateLong: "August 12, 2026",
    author: "Angeline",
  },
  {
    slug: "services-terminated-for-abuse-email",
    title: "Services Terminated for Abuse Email",
    excerpt:
      "In the interest of Service Termination: Hello, This email is to notify you that your services with Gravel Host have been permanently flagged.",
    category: "Guidelines",
    date: "Aug 12, 2026",
    dateLong: "August 12, 2026",
    author: "Angeline",
  },
  {
    slug: "ddoss-response",
    title: "DDoss Response",
    excerpt:
      "Gravel Host DDoS attack sec, law, and applicable laws, please understand our platform guidelines while we work to improve our routing policies.",
    category: "Scripts",
    date: "Aug 11, 2026",
    dateLong: "August 11, 2026",
    author: "Angeline",
  },
  {
    slug: "copyright-infringement-claims-team-response",
    title: "Copyright infringement claims Team Response",
    excerpt:
      "Dear [Claimant], We have received your complaint and are investigating the matter across active client nodes to resolve potential issues swiftly.",
    category: "Copyright",
    date: "Jul 18, 2026",
    dateLong: "July 18, 2026",
    author: "Angeline",
  },
  {
    slug: "available-discount-codes",
    title: "Available Discount Codes",
    excerpt:
      "Available discount codes for Gravel Host customers. Please see below Customer Discount promotions and referral rules for the Q3 campaign.",
    category: "Processes",
    date: "Jul 2, 2026",
    dateLong: "July 2, 2026",
    author: "Angeline",
  },
];

export const TAGS = [
  "#security",
  "#compliance",
  "#hosting",
  "#billing",
  "#announcement",
  "#templates",
  "#support",
  "#gravel-host",
];

export const CARD = "rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]";

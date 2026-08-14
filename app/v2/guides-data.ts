import type { Article } from "./news-data";

// Placeholder guide content for the v2 canvas. Guides reuse the news shape,
// categories and pill palette from news-data - there is no separate guides
// frame in Figma, so the two sections are the same design over different
// content. Replaced by news_post once v2 reads from the database.
//
// Unlike the news entries, none of this copy comes from a frame: the guides
// frame does not exist, so these six are written to fill the layout.

export const GUIDES: Article[] = [
  {
    slug: "spinning-up-a-minecraft-server",
    title: "Spinning Up a Minecraft Server",
    excerpt:
      "Pick the egg, allocate the port, set the startup flags and hand the panel over. Covers Paper, Fabric and Forge, plus the first-boot EULA step clients always miss.",
    category: "Guidelines",
    date: "Aug 13, 2026",
    dateLong: "August 13, 2026",
    author: "Angeline",
    tags: ["minecraft", "provisioning", "panel"],
  },
  {
    slug: "resetting-panel-credentials",
    title: "Resetting Panel Credentials",
    excerpt:
      "How to verify a client before touching their account, issue a reset from the panel, and what to do when the address on file no longer receives mail.",
    category: "Processes",
    date: "Aug 10, 2026",
    dateLong: "August 10, 2026",
    author: "Angeline",
    tags: ["security", "panel", "verification"],
  },
  {
    slug: "diagnosing-high-cpu-on-a-node",
    title: "Diagnosing High CPU on a Node",
    excerpt:
      "Read the node graphs, find the container burning the budget, and decide between a plugin fix, a view-distance change and a migration to quieter hardware.",
    category: "Guidelines",
    date: "Aug 6, 2026",
    dateLong: "August 6, 2026",
    author: "Angeline",
    tags: ["nodes", "performance", "escalation"],
  },
  {
    slug: "refund-request-reply",
    title: "Refund Request Reply",
    excerpt:
      "The wording we use for refunds inside and outside the window, what to promise about timing, and when the request has to go to billing instead.",
    category: "Scripts",
    date: "Aug 1, 2026",
    dateLong: "August 1, 2026",
    author: "Angeline",
    tags: ["billing", "templates", "refunds"],
  },
  {
    slug: "handling-a-dmca-takedown",
    title: "Handling a DMCA Takedown",
    excerpt:
      "What to suspend, what to preserve, and how to reply to both the claimant and the client without agreeing to anything the company has not agreed to.",
    category: "Copyright",
    date: "Jul 24, 2026",
    dateLong: "July 24, 2026",
    author: "Angeline",
    tags: ["legal", "compliance", "takedowns"],
  },
  {
    slug: "onboarding-a-new-support-member",
    title: "Onboarding a New Support Member",
    excerpt:
      "First-week checklist: Discord roles, panel access, the ticket queue walkthrough, and which games to shadow before taking a channel unsupervised.",
    category: "Processes",
    date: "Jul 15, 2026",
    dateLong: "July 15, 2026",
    author: "Angeline",
    tags: ["onboarding", "team", "training"],
  },
];

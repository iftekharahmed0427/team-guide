import {
  Bot,
  CalendarRange,
  Coins,
  Gamepad2,
  List,
  ScrollText,
  Users,
} from "lucide-react";

// The settings map: what groups exist, what each one holds, and the words an
// admin might reach for when looking for it.
//
// `contains` is the point of this file. The old settings had five flat rows and
// no way in except knowing which row hid what you wanted, so the overview
// searches individual settings rather than page titles: "token" finds the bot,
// "5%" finds the pay rules, "reset" finds the period under its real name.
//
// No database import, so both the server page and the client overview can read
// it. The live numbers on each card come from settings-data.ts instead.

/** The live numbers each card shows, keyed by group id. Declared here rather
 * than beside the query so the client overview never imports the db module. */
export type SettingsFacts = Record<string, string[]>;

export type SettingsGroup = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  /** Where this lives when it is not a settings page, shown on the card. */
  elsewhere?: string;
  /** The individual settings inside, and the words that should find them. */
  contains: { label: string; keywords?: string }[];
};

export const GROUPS: SettingsGroup[] = [
  {
    id: "period",
    label: "Period",
    description:
      "How long a period runs, and the one action that closes it and archives everything.",
    href: "/settings/period",
    icon: CalendarRange,
    contains: [
      { label: "Period length", keywords: "days duration how long fortnight" },
      {
        label: "End period",
        keywords: "reset all close archive zero counts wipe start over",
      },
      { label: "What a reset archives", keywords: "history archive periods" },
    ],
  },
  {
    id: "bot",
    label: "Discord bot",
    description:
      "The ticket-counting bot: its credentials, how it appears, what it posts, and where it counts.",
    href: "/settings/bot",
    icon: Bot,
    contains: [
      { label: "Bot token", keywords: "credentials secret key auth login" },
      { label: "Bot status", keywords: "online offline error heartbeat" },
      { label: "Run report now", keywords: "test post trigger manual" },
      {
        label: "Presence",
        keywords: "playing watching listening activity status idle dnd",
      },
      {
        label: "Announcement",
        keywords: "embed leaderboard title colour color intro footer",
      },
      { label: "Announcement ping", keywords: "role mention notify" },
      {
        label: "Report channels",
        keywords: "screenshots counting per member channel id",
      },
    ],
  },
  {
    id: "lists",
    label: "Lists",
    description:
      "The option lists behind the pickers: payment roles, dispute categories and review sources.",
    href: "/settings/lists",
    icon: List,
    contains: [
      { label: "Payment roles", keywords: "role base pay per ticket payroll" },
      { label: "Dispute categories", keywords: "chargeback reason type" },
      { label: "Review sources", keywords: "trustpilot google where review" },
    ],
  },
  {
    id: "pay-rules",
    label: "Pay rules",
    description:
      "The numbers behind every payout: the ticket rate and the two bonus rules.",
    href: "/settings/pay-rules",
    icon: Coins,
    contains: [
      { label: "Ticket rate", keywords: "per ticket dollar rate 1 payout" },
      {
        label: "Dispute bonus rate",
        keywords: "5% five percent recovered won disputes",
      },
      {
        label: "Review bonus threshold",
        keywords: "how many reviews target team goal",
      },
      { label: "Review bonus amount", keywords: "flat bonus per member" },
    ],
  },
  {
    id: "activity",
    label: "Activity log",
    description: "Every action taken on the portal, and every sign-in.",
    href: "/settings/activity",
    icon: ScrollText,
    contains: [
      { label: "Who changed what", keywords: "audit trail history log" },
      { label: "Sign-ins", keywords: "logins who logged in" },
    ],
  },
  {
    id: "people",
    label: "People",
    description: "Invite a member, change who is an admin, or remove someone.",
    href: "/team",
    icon: Users,
    elsewhere: "on the Team page",
    contains: [
      { label: "Invite a member", keywords: "add new join invite link" },
      { label: "Change a role", keywords: "admin promote demote permissions" },
      { label: "Remove a member", keywords: "delete kick offboard" },
      { label: "Pending invites", keywords: "revoke unaccepted" },
    ],
  },
  {
    id: "games",
    label: "Games",
    description:
      "The game list behind guide categories and the specialists matrix.",
    href: "/specialists",
    icon: Gamepad2,
    elsewhere: "on the Specialists page",
    contains: [
      { label: "Add a game", keywords: "new game category" },
      { label: "Rename a game", keywords: "edit game" },
      { label: "Delete a game", keywords: "remove game" },
    ],
  },
];

/** The groups that are real settings pages, in rail order. */
export const SETTINGS_GROUPS = GROUPS.filter((g) => !g.elsewhere);

export type Match = { group: SettingsGroup; hits: string[] };

// A group matches on its own name or blurb, or on any setting inside it. When
// the hit is on a setting the overview names it, so the answer to "where does
// the token live" is the word "Bot token" on the Discord bot card.
export function search(query: string): Match[] {
  const q = query.trim().toLowerCase();
  if (!q) return GROUPS.map((group) => ({ group, hits: [] }));

  const results: Match[] = [];
  for (const group of GROUPS) {
    const hits = group.contains
      .filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          (c.keywords ?? "").toLowerCase().includes(q),
      )
      .map((c) => c.label);

    const groupHit =
      group.label.toLowerCase().includes(q) ||
      group.description.toLowerCase().includes(q);

    if (hits.length > 0 || groupHit) results.push({ group, hits });
  }
  return results;
}

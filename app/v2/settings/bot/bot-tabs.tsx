"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The bot's four panels. The live settings put all of them on one page: status,
// controls, token, presence, announcement and report channels, in one scroll of
// six unrelated cards. Splitting them means an admin who wants the presence text
// is not scrolling past the token box to reach it.

const TABS = [
  { label: "Connection", href: "/v2/settings/bot" },
  { label: "Presence", href: "/v2/settings/bot/presence" },
  { label: "Announcement", href: "/v2/settings/bot/announcement" },
  { label: "Report channels", href: "/v2/settings/bot/channels" },
];

export default function BotTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-[4px] border-b border-[#243033]!">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-[14px] py-[10px] text-[14px] transition-colors ${
              active
                ? "border-[#8fb0a7]! font-semibold text-[#8fb0a7]"
                : "border-transparent! font-medium text-[#94a3b8] hover:text-[#e2e8f0]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

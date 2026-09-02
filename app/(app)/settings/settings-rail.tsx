"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SETTINGS_GROUPS } from "./settings-index";

// The rail on every settings page except the overview, so an admin can move
// between groups without going back through the hub. The overview is the hub,
// so it renders nothing there and takes the full width for its card grid.
//
// Active state matches the section, not the exact path, so the bot's four
// sub-pages all keep "Discord bot" lit.

export default function SettingsRail() {
  const pathname = usePathname();
  if (pathname === "/settings") return null;

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <nav className="flex w-[212px] shrink-0 flex-col gap-[4px] border-r border-[#243033]! p-[16px]">
      <Link
        href="/settings"
        className="mb-[8px] flex items-center gap-[8px] rounded-[8px] px-[12px] py-[10px] text-[13px] font-semibold text-[#94a3b8] transition-colors hover:bg-white/[0.03] hover:text-[#e2e8f0]"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        All settings
      </Link>

      {SETTINGS_GROUPS.map((group) => {
        const Icon = group.icon;
        const active =
          pathname === group.href || pathname.startsWith(`${group.href}/`);
        return (
          <Link
            key={group.id}
            href={group.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-[10px] rounded-[8px] px-[12px] py-[10px] text-[14px] transition-colors ${
              active
                ? "bg-[#8fb0a7]/10 font-semibold text-[#8fb0a7]"
                : "font-medium text-[#94a3b8] hover:bg-white/[0.03] hover:text-[#e2e8f0]"
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            {group.label}
          </Link>
        );
      })}
    </nav>
  );
}

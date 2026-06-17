"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";

const sections = [{ label: "Discord bot", href: "/settings/discord-bot", icon: Bot }];

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 sm:flex">
      <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
        Sections
      </p>
      {sections.map((s) => {
        const Icon = s.icon;
        const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`flex items-center gap-2.5 border px-3 py-2 text-sm transition-colors ${
              active
                ? "border-border bg-surface-2 text-foreground"
                : "border-transparent text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <Icon size={16} strokeWidth={1.75} />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

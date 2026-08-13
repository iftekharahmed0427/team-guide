"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Newspaper,
  BookOpen,
  SquareKanban,
  Ticket,
  Star,
  HandCoins,
  Gavel,
  Wallet,
  ClipboardCheck,
  Gamepad2,
  Users,
  Server,
  CircleUser,
  Cpu,
  Settings,
  MoreHorizontal,
} from "lucide-react";

// v2 side navigation. Same items and grouping as the live sidebar; the styling
// is the redesign: light surface, rounded pill rows, small uppercase section
// labels, tinted active row, pinned account card with a scroll fade above it.
//
// Rows are buttons, not links, while v2 is a canvas - clicking one only moves
// the active state so the styling can be seen. They become <Link> once the v2
// routes exist.

type NavItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

type NavGroup = { label?: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { items: [{ label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Workspace",
    items: [
      { label: "News", icon: Newspaper },
      { label: "Guides", icon: BookOpen },
      { label: "Board", icon: SquareKanban },
      { label: "Reports", icon: Ticket },
      { label: "Reviews", icon: Star },
      { label: "Commissions", icon: HandCoins },
      { label: "Disputes", icon: Gavel },
      { label: "Payments", icon: Wallet },
      { label: "Audits", icon: ClipboardCheck },
      { label: "Specialists", icon: Gamepad2 },
      { label: "Team", icon: Users },
    ],
  },
  {
    label: "Panel tools",
    items: [
      { label: "Server lookup", icon: Server },
      { label: "User lookup", icon: CircleUser },
      { label: "Node lookup", icon: Cpu },
    ],
  },
  {
    label: "General",
    items: [{ label: "Settings", icon: Settings }],
  },
];

function initialsOf(source?: string | null): string {
  const s = (source ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export default function V2Sidebar({
  user,
}: {
  user: { name: string; email: string; image: string | null };
}) {
  const [active, setActive] = useState("Dashboard");

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which wins
  // over Tailwind's layered border utilities, so v2's light borders are marked
  // important to opt out of the app-wide dark default.
  return (
    <aside className="relative flex w-[268px] shrink-0 flex-col border-r border-slate-200! bg-white">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <Image
          src="/logo.png"
          alt="Team Guide"
          width={2018}
          height={819}
          priority
          className="h-7 w-auto shrink-0 object-contain"
        />
        <span className="text-[19px] font-semibold tracking-tight text-slate-900">
          Team Guide
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-10">
        {GROUPS.map((group, i) => (
          <div key={group.label ?? `group-${i}`}>
            {group.label ? (
              <p className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            ) : null}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActive(item.label)}
                  className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
                    isActive
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    className={isActive ? "text-blue-600" : "text-slate-500"}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Fades the nav out as it scrolls under the account card. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[76px] h-10 bg-gradient-to-t from-white to-transparent" />

      <div className="border-t border-slate-200! p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-100"
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700">
              {initialsOf(user.name)}
            </span>
          )}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-medium text-slate-900">
              {user.name}
            </span>
            <span className="block truncate text-xs text-slate-500">{user.email}</span>
          </span>
          <MoreHorizontal size={18} strokeWidth={1.75} className="shrink-0 text-slate-400" />
        </button>
      </div>
    </aside>
  );
}

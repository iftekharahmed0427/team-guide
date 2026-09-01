"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";

// v2 side navigation. Same items and grouping as the live sidebar; the surface,
// type and spacing are lifted from the "team-dashboard-components" Figma frame
// (node 3:5) - dark #0e1217 panel, hairline #243033 edges, sage #8fb0a7 accent
// on the active row, and Figtree throughout.
//
// Only the nav scrolls - the brand lockup and the account pill are both pinned.
// The rail is the frame's scrollbar-track/thumb (narrowed to 2px) rather than
// the platform default, so it is always shown (overflow-y-scroll) as drawn.
//
// Rows with an href are real links and take their active state from the path.
// The rest are still buttons while v2 is a canvas - clicking one only moves the
// highlight so the styling can be seen. They get an href as each route lands.

type NavItem = {
  label: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  href?: string;
};

type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/v2" }],
  },
  {
    label: "Workspace",
    items: [
      { label: "News", icon: Newspaper, href: "/v2/news" },
      { label: "Guides", icon: BookOpen, href: "/v2/guides" },
      { label: "Board", icon: SquareKanban, href: "/v2/board" },
      { label: "Reports", icon: Ticket, href: "/v2/reports" },
      { label: "Reviews", icon: Star, href: "/v2/reviews" },
      { label: "Commissions", icon: HandCoins, href: "/v2/commissions" },
      { label: "Disputes", icon: Gavel, href: "/v2/disputes" },
      { label: "Payments", icon: Wallet, href: "/v2/payments" },
      { label: "Audits", icon: ClipboardCheck, href: "/v2/audits" },
      { label: "Specialists", icon: Gamepad2, href: "/v2/specialists" },
      { label: "Team", icon: Users, href: "/v2/team" },
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
  // A routed row wins unless an unrouted one was picked since the last
  // navigation, so the highlight never sits on two rows at once.
  const [picked, setPicked] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const routed = GROUPS.flatMap((g) => g.items)
    .filter(
      (i) =>
        i.href && (pathname === i.href || pathname.startsWith(`${i.href}/`)),
    )
    .sort((a, b) => b.href!.length - a.href!.length)[0];
  const active = picked ?? routed?.label;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which wins
  // over Tailwind's layered border utilities, so every border here is marked
  // important to opt out of the app-wide default.
  return (
    <aside className="flex w-[260px] shrink-0 flex-col justify-between border-r border-[#243033]! bg-[#0e1217]">
      <div className="flex items-center gap-[12px] px-[24px] pt-[24px]">
        <span className="size-[36px] shrink-0 overflow-hidden rounded-[4px]">
          <Image
            src="/logo.png"
            alt="Gravel Host"
            width={2018}
            height={819}
            priority
            className="size-full object-contain"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[18px] font-bold text-[#e2e8f0]">
            GRAVEL HOST
          </span>
          <span className="block truncate text-[11px] font-semibold text-[#ff7a59]">
            TEAM PORTAL
          </span>
        </span>
      </div>

      {/* Right padding is 19px so that nav rows clear the 2px rail and its 3px
          gutter at exactly the frame's 24px inset. */}
      <nav className="v2-rail mt-[20px] mr-[3px] flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-scroll pr-[19px] pb-[24px] pl-[24px]">
        {GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-[8px]">
            <p className="text-[11px] font-bold tracking-[0.88px] text-[#94a3b8] uppercase">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.label;
              const className = `flex w-full cursor-pointer items-center gap-[12px] rounded-[8px] border px-[12px] py-[10px] text-[14px] transition-colors ${
                isActive
                  ? "border-[#243033]! bg-[#171e24] font-semibold text-[#e2e8f0]"
                  : "border-transparent! font-medium text-[#94a3b8] hover:bg-[#171e24]/60 hover:text-[#e2e8f0]"
              }`;
              const inner = (
                <>
                  <Icon
                    size={18}
                    strokeWidth={2}
                    className={`shrink-0 ${isActive ? "text-[#8fb0a7]" : "text-[#94a3b8]"}`}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              );

              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setPicked(null)}
                  className={className}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setPicked(item.label)}
                  className={className}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-[24px] pt-[12px] pb-[24px]">
        <div className="flex items-center gap-[12px] rounded-[8px] bg-[#171e24] p-[12px]">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name}
              className="size-[32px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-[#243033] text-[11px] font-semibold text-[#e2e8f0]">
              {initialsOf(user.name)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[#e2e8f0]">
              {user.name}
            </span>
            <span className="block truncate text-[11px] font-normal text-[#94a3b8]">
              {user.email}
            </span>
          </span>
          {/* Negative margin keeps the 14px glyph on the frame's grid while
              giving the control a 26px hit target. */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Log out"
            title="Log out"
            className="-m-[6px] shrink-0 cursor-pointer p-[6px] text-[#94a3b8] transition-colors hover:text-[#8fb0a7] disabled:cursor-default disabled:opacity-50"
          >
            <LogOut size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Users,
  SquareKanban,
  BookOpen,
  Ticket,
  Settings,
  LifeBuoy,
  LogOut,
  Box,
  Shield,
  Loader2,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Avatar from "@/app/components/avatar";

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

type NavItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  href?: string;
  badge?: string;
  adminOnly?: boolean;
};

const primaryNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "News", icon: Newspaper, href: "/news" },
  { label: "Guides", icon: BookOpen, href: "/guides" },
  { label: "Board", icon: SquareKanban, href: "/board" },
  { label: "Reports", icon: Ticket, href: "/reports" },
  { label: "Team", icon: Users, href: "/team" },
];

const secondaryNav: NavItem[] = [
  { label: "Settings", icon: Settings, href: "/settings", adminOnly: true },
  { label: "Support", icon: LifeBuoy },
];

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const className = `group flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors ${
    active
      ? "border-foreground bg-surface-2 text-foreground"
      : "border-transparent text-muted hover:bg-surface-2 hover:text-foreground"
  }`;

  const content = (
    <>
      <Icon size={18} strokeWidth={1.75} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge ? (
        <span className="border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted">
          {item.badge}
        </span>
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const isAdmin = user.role === "admin";

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center border border-border bg-surface-2">
          <Box size={18} strokeWidth={1.75} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Team Guide</p>
          <p className="text-[11px] text-muted">Workspace</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto py-4">
        <p className="px-5 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
          Menu
        </p>
        {primaryNav
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavRow key={item.label} item={item} active={isActive(item)} />
          ))}

        <p className="px-5 pb-2 pt-6 text-[11px] font-medium uppercase tracking-wider text-muted">
          General
        </p>
        {secondaryNav
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavRow key={item.label} item={item} active={isActive(item)} />
          ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 border border-border bg-surface-2 px-3 py-2.5">
          <Avatar name={user.name} image={user.image} size={32} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium">{user.name || "Member"}</p>
              {isAdmin ? (
                <span className="flex shrink-0 items-center gap-1 border border-border px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                  <Shield size={10} strokeWidth={2} />
                  Admin
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px] text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-transparent text-muted transition-colors hover:border-border hover:text-foreground disabled:opacity-60"
          >
            {signingOut ? (
              <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <LogOut size={16} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

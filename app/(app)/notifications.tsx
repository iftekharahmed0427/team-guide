"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { Notice } from "./notifications-data";
import Avatar from "./avatar";

// Bell trigger plus the notification dropdown, from the "notification-dropdown"
// Figma frame (node 15:378). Its own client component so the dashboard around
// it stays a server component.
//
// The rows are the activity log, filtered to what a teammate would want to hear
// about. Two things follow from there, and both are deliberate:
//
// The frame draws a "Mentions" tab. Nothing in the app produces a mention, so
// the tab would always be empty and it is not rendered. All and Unread are.
//
// Read state is per browser, in localStorage, because there is nowhere to put
// it per account: the log records who did a thing, never who it was for. A real
// per-person inbox - "your audit was graded", "you were assigned this card" -
// needs its own table with a recipient and a read flag, and producers wherever
// those events happen. This is the honest version of that until it exists.

const SEEN_KEY = "v2-notifications-seen";

const TABS = ["All", "Unread"] as const;
type Tab = (typeof TABS)[number];

// The "seen" marker as a tiny external store. Read through
// useSyncExternalStore rather than set from an effect: the server snapshot
// is null, so nothing is unread until the browser has actually read
// localStorage, and the markup matches on both sides.
let seenCache: number | null = null;
const listeners = new Set<() => void>();

function seenSnapshot(): number {
  if (seenCache === null) {
    try {
      seenCache = Number(window.localStorage.getItem(SEEN_KEY)) || 0;
    } catch {
      // Private windows and blocked site data both throw; everything then
      // reads as unread, which is the safer way round.
      seenCache = 0;
    }
  }
  return seenCache;
}

function subscribeSeen(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writeSeen(stamp: number) {
  seenCache = stamp;
  try {
    window.localStorage.setItem(SEEN_KEY, String(stamp));
  } catch {
    // Nothing to do: the badge still clears for this view.
  }
  for (const listener of listeners) listener();
}

export default function Notifications({
  notices,
  isAdmin,
}: {
  notices: Notice[];
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("All");
  const seen = useSyncExternalStore(subscribeSeen, seenSnapshot, () => null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isUnread = (n: Notice) => seen !== null && n.at > seen;
  const unreadCount = notices.filter(isUnread).length;
  const shown = tab === "Unread" ? notices.filter(isUnread) : notices;

  function markAllRead() {
    writeSeen(Date.now());
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        className="relative flex size-[40px] cursor-pointer items-center justify-center rounded-[8px] border border-[#243033]! bg-[#171e24] transition-colors hover:border-[#2f3d42]!"
      >
        <Bell size={18} strokeWidth={2} className="text-[#e2e8f0]" />
        {unreadCount > 0 ? (
          <span className="absolute top-px right-px flex size-[16px] items-center justify-center rounded-full bg-[#8fb0a7] text-[9px] font-bold text-[#0f141a]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-20 mt-[8px] w-[360px]">
          {/* Arrow: the frame's 14x8 triangle in the panel surface with the
              panel's border, centred on the bell rather than on the frame's
              own offset, which was set by its preview layout. */}
          <span className="absolute -top-[7px] right-[13px] block size-0 border-r-[7px] border-b-[8px] border-l-[7px] border-r-transparent border-b-[#243033] border-l-transparent" />
          <span className="absolute -top-[6px] right-[14px] block size-0 border-r-[6px] border-b-[7px] border-l-[6px] border-r-transparent border-b-[#171e24] border-l-transparent" />

          <div className="flex flex-col overflow-hidden rounded-[12px] border border-[#243033]! bg-[#171e24] leading-[normal] shadow-[0px_12px_24px_0px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between border-b border-[#243033]! p-[16px]">
              <p className="text-[15px] font-bold text-[#e2e8f0]">
                Notifications
              </p>
              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="cursor-pointer text-[12px] font-semibold text-[#8fb0a7] underline decoration-solid disabled:cursor-default disabled:text-[#64748b] disabled:no-underline"
              >
                Mark all as read
              </button>
            </div>

            <div className="flex items-center gap-[6px] px-[16px] py-[10px]">
              {TABS.map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`cursor-pointer rounded-full border px-[10px] py-[4px] text-[11px] font-bold ${
                      active
                        ? "border-[#8fb0a7]! bg-[#8fb0a7]/[0.12] text-[#8fb0a7]"
                        : "border-transparent! text-[#94a3b8] hover:text-[#e2e8f0]"
                    }`}
                  >
                    {t}
                    {t === "Unread" && unreadCount > 0 ? ` ${unreadCount}` : ""}
                  </button>
                );
              })}
            </div>

            <div className="h-px w-full bg-[#243033]" />

            <div className="v2-rail flex max-h-[380px] flex-col overflow-y-auto">
              {shown.length === 0 ? (
                <p className="px-[16px] py-[24px] text-center text-[12px] text-[#64748b]">
                  {tab === "Unread" ? "Nothing new" : "Nothing here yet"}
                </p>
              ) : (
                shown.map((n, i) => (
                  <div key={n.id} className="flex flex-col">
                    <div
                      className={`flex w-full items-center gap-[12px] px-[16px] py-[12px] text-left ${
                        isUnread(n) ? "bg-white/[0.03]" : ""
                      }`}
                    >
                      <span className="flex size-[6px] shrink-0 items-center justify-center">
                        {isUnread(n) ? (
                          <span className="size-[6px] rounded-full bg-[#8fb0a7]" />
                        ) : null}
                      </span>
                      <Avatar
                        name={n.actor}
                        image={n.image}
                        size={28}
                        variant="muted"
                        textClassName="text-[11px] font-bold"
                        className="bg-white/[0.06]!"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                        <span className="text-[13px] leading-[1.4] font-normal text-[#94a3b8]">
                          <span className="font-bold text-[#e2e8f0]">
                            {n.actor}
                          </span>{" "}
                          {n.action}
                          {n.target ? (
                            <span className="text-[#e2e8f0]"> {n.target}</span>
                          ) : null}
                        </span>
                        <span className="text-[11px] font-normal text-[#64748b]">
                          {n.when}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-[4px] border border-[#243033]! bg-white/[0.03] px-[8px] py-[2px] text-[10px] font-semibold text-[#94a3b8]">
                        {n.tag}
                      </span>
                    </div>
                    {i < shown.length - 1 ? (
                      <div className="h-px w-full bg-[#243033]" />
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="h-px w-full bg-[#243033]" />

            <div className="flex items-center justify-center p-[14px]">
              {isAdmin ? (
                <Link
                  href="/settings/activity"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer text-[13px] font-semibold text-[#8fb0a7] transition-opacity hover:opacity-80"
                >
                  View the full activity log
                </Link>
              ) : (
                <p className="text-[12px] font-normal text-[#64748b]">
                  The last {shown.length} things that happened
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

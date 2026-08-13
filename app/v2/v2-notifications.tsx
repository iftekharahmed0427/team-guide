"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

// Bell trigger plus the notification dropdown, from the "notification-dropdown"
// Figma frame (node 15:378). Kept as its own client component so the dashboard
// around it stays a server component.
//
// Content is the frame's placeholder copy - nothing here reads from the
// database yet.

type Tone = "sage" | "neutral" | "green";

type Note = {
  id: number;
  initials: string;
  tone: Tone;
  actor: string;
  action: string;
  at: string;
  tag?: string;
  unread: boolean;
  mention: boolean;
};

const SEED: Note[] = [
  {
    id: 1,
    initials: "AN",
    tone: "sage",
    actor: "Angeline",
    action: " posted 'Security Verification Requirements'",
    at: "2h ago",
    tag: "Guidelines",
    unread: true,
    mention: false,
  },
  {
    id: 2,
    initials: "OS",
    tone: "neutral",
    actor: "OrewSegs",
    action: " checked in for shift",
    at: "4h ago",
    unread: true,
    mention: false,
  },
  {
    id: 3,
    initials: "TR",
    tone: "neutral",
    actor: "Trinity™",
    action: " commented on 'DDoss Response'",
    at: "6h ago",
    tag: "Scripts",
    unread: false,
    mention: false,
  },
  {
    id: 4,
    initials: "SY",
    tone: "green",
    actor: "System",
    action: " Server backup completed successfully",
    at: "8h ago",
    tag: "System",
    unread: false,
    mention: false,
  },
  {
    id: 5,
    initials: "AN",
    tone: "sage",
    actor: "Angeline",
    action: " updated 'Review Links' document",
    at: "1d ago",
    tag: "Processes",
    unread: false,
    mention: false,
  },
  {
    id: 6,
    initials: "SV",
    tone: "neutral",
    actor: "Siren Vampy",
    action: " started shift",
    at: "1d ago",
    unread: false,
    mention: false,
  },
];

const TONES: Record<Tone, string> = {
  sage: "bg-[#8fb0a7]/20 text-[#8fb0a7]",
  neutral: "bg-white/[0.06] text-[#e2e8f0]",
  green: "bg-[#10b981]/[0.11] text-[#10b981]",
};

const TABS = ["All", "Unread", "Mentions"] as const;
type Tab = (typeof TABS)[number];

export default function V2Notifications() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("All");
  const [notes, setNotes] = useState(SEED);
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

  const unreadCount = notes.filter((n) => n.unread).length;
  const shown = notes.filter((n) =>
    tab === "Unread" ? n.unread : tab === "Mentions" ? n.mention : true,
  );

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notifications"
        className="relative flex size-[40px] cursor-pointer items-center justify-center rounded-[8px] border border-[#243033]! bg-[#171e24]"
      >
        <Bell size={18} strokeWidth={2} className="text-[#e2e8f0]" />
        {unreadCount > 0 ? (
          <span className="absolute top-px right-px flex size-[16px] items-center justify-center rounded-full bg-[#8fb0a7] text-[9px] font-bold text-[#0f141a]">
            {unreadCount}
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
              <p className="text-[15px] font-bold text-[#e2e8f0]">Notifications</p>
              <button
                type="button"
                onClick={() => setNotes((prev) => prev.map((n) => ({ ...n, unread: false })))}
                className="cursor-pointer text-[12px] font-semibold text-[#8fb0a7] underline decoration-solid"
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
                  </button>
                );
              })}
            </div>

            <div className="h-px w-full bg-[#243033]" />

            <div className="flex flex-col">
              {shown.length === 0 ? (
                <p className="px-[16px] py-[24px] text-center text-[12px] text-[#64748b]">
                  Nothing here yet
                </p>
              ) : (
                shown.map((n, i) => (
                  <div key={n.id} className="flex flex-col">
                    <button
                      type="button"
                      className={`flex w-full cursor-pointer items-center gap-[12px] px-[16px] py-[12px] text-left ${
                        n.unread ? "bg-white/[0.03]" : ""
                      }`}
                    >
                      <span className="flex size-[6px] shrink-0 items-center justify-center">
                        {n.unread ? (
                          <span className="size-[6px] rounded-full bg-[#8fb0a7]" />
                        ) : null}
                      </span>
                      <span
                        className={`flex size-[28px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${TONES[n.tone]}`}
                      >
                        {n.initials}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                        <span className="text-[13px] leading-[1.4] font-normal text-[#94a3b8]">
                          <span className="font-bold text-[#e2e8f0]">{n.actor}</span>
                          {n.action}
                        </span>
                        <span className="text-[11px] font-normal text-[#64748b]">{n.at}</span>
                      </span>
                      {n.tag ? (
                        <span className="shrink-0 rounded-[4px] border border-[#243033]! bg-white/[0.03] px-[8px] py-[2px] text-[10px] font-semibold text-[#94a3b8]">
                          {n.tag}
                        </span>
                      ) : null}
                    </button>
                    {i < shown.length - 1 ? <div className="h-px w-full bg-[#243033]" /> : null}
                  </div>
                ))
              )}
            </div>

            <div className="h-px w-full bg-[#243033]" />

            <div className="flex items-center justify-center p-[14px]">
              <button
                type="button"
                className="cursor-pointer text-[13px] font-semibold text-[#8fb0a7]"
              >
                View all notifications
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

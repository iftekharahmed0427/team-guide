"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { BotStatusPayload } from "./status";

function ago(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - Date.parse(iso);
  if (ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function BotStatusPanel({ initial }: { initial: BotStatusPayload }) {
  const [status, setStatus] = useState(initial);

  // Poll so online/offline + errors stay live without reloading the page. Only
  // while the tab is VISIBLE - a hidden/background tab pauses the poll so it stops
  // hitting /api/bot-status (and the DB behind it) for a panel nobody is looking
  // at. Becoming visible again does one immediate catch-up fetch.
  useEffect(() => {
    let active = true;
    let id: ReturnType<typeof setInterval> | undefined;
    const tick = async () => {
      try {
        const r = await fetch("/api/bot-status", { cache: "no-store" });
        if (r.ok && active) setStatus(await r.json());
      } catch {
        // transient; next tick retries
      }
    };
    const start = () => {
      if (id || document.hidden) return;
      void tick(); // catch up immediately, then on an interval
      id = setInterval(tick, 15000);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const hbAge = status.lastHeartbeatAt
    ? Date.now() - Date.parse(status.lastHeartbeatAt)
    : Infinity;
  const fresh = hbAge < 90_000;

  let label: string;
  let dot: string;
  let text: string;
  if (status.state === "no_token") {
    label = "No token set";
    dot = "bg-amber-400";
    text = "text-amber-400";
  } else if (status.state === "online" && fresh) {
    label = "Online";
    dot = "bg-emerald-400";
    text = "text-emerald-400";
  } else {
    label = "Offline";
    dot = "bg-muted";
    text = "text-muted";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 border border-border bg-surface-2 px-3 py-1.5">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className={`text-sm font-medium ${text}`}>{label}</span>
        </span>
        {status.botTag ? (
          <span className="text-sm text-muted">
            as <span className="font-medium text-foreground">{status.botTag}</span>
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-px border border-border bg-border text-sm sm:grid-cols-3">
        <div className="bg-surface px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">Heartbeat</p>
          <p className="mt-0.5">{ago(status.lastHeartbeatAt)}</p>
        </div>
        <div className="bg-surface px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">Last report</p>
          <p className="mt-0.5">{ago(status.lastReportAt)}</p>
        </div>
        <div className="bg-surface px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">State</p>
          <p className="mt-0.5 capitalize">{status.state.replace("_", " ")}</p>
        </div>
      </div>

      {status.lastError ? (
        <div className="border border-red-500/40 bg-red-500/5 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-red-400">
            <AlertTriangle size={13} strokeWidth={2} />
            Last error · {ago(status.lastErrorAt)}
          </div>
          <p className="mt-1.5 whitespace-pre-wrap break-words font-mono text-xs text-muted">
            {status.lastError}
          </p>
        </div>
      ) : null}
    </div>
  );
}

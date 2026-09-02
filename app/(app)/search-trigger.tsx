"use client";

import { useSyncExternalStore } from "react";
import { Search } from "lucide-react";
import { OPEN_EVENT } from "./search-palette";

// The dashboard's search box, which the frame draws as a field but which is
// really a button: it opens the palette rather than taking typing itself.
//
// The palette lives in the v2 layout so Cmd/Ctrl+K works everywhere, so this
// reaches it through a window event rather than a prop.

// The platform never changes under us, so there is nothing to subscribe to.
const subscribe = () => () => {};
const clientChord = () =>
  /mac|iphone|ipad/i.test(navigator.userAgent) ? "⌘K" : "Ctrl K";

export default function SearchTrigger() {
  // The shortcut hint depends on the platform, which only the browser knows.
  // Read as an external store rather than set in an effect: the server snapshot
  // is null, so the server and client markup agree and the hint appears on
  // hydration without a second render pass.
  const chord = useSyncExternalStore(subscribe, clientChord, () => null);

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="flex w-[280px] cursor-pointer items-center gap-[10px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[14px] py-[10px] text-left transition-colors hover:border-[#2f3d42]!"
    >
      <Search size={14} strokeWidth={2} className="shrink-0 text-[#94a3b8]" />
      <span className="min-w-0 flex-1 truncate text-[14px] font-normal text-[#94a3b8]">
        Search news, guides and notes
      </span>
      {chord ? (
        <kbd className="shrink-0 rounded-[4px] border border-[#243033]! px-[6px] py-[2px] text-[11px] font-semibold text-[#64748b]">
          {chord}
        </kbd>
      ) : null}
    </button>
  );
}

"use client";

import { useCallback, useState } from "react";
import { initialsOf, tintFor } from "./member";

// A member's Discord avatar, falling back to their tinted initials.
//
// The fallback is not only for a member who has no avatar. A Discord CDN URL is
// pinned to the avatar hash, so it stops resolving the moment that member
// changes their picture, and the stored URL points at something that no longer
// exists. Three of eleven were already dead when this was written. The bot
// refreshes them hourly, but a broken image must never reach the page in the
// meantime, so a failed load is treated exactly like having no avatar.
//
// Catching that failure takes two checks, not one. The markup is server
// rendered, so the browser usually starts (and finishes) loading the image
// before React hydrates: the error fires on a DOM node React is not yet
// listening to, and an `onError` handler alone never runs. `settle` therefore
// re-asks the element on mount - a complete image with no intrinsic width is
// one that failed - and onError covers anything that breaks later.

export default function Avatar({
  name,
  image,
  size,
  /** "tint" colours the fallback by name; "muted" is the sidebar's flat chip. */
  variant = "tint",
  className = "",
}: {
  name: string;
  image: string | null;
  size: number;
  variant?: "tint" | "muted";
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const settle = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) {
      setFailedSrc(el.getAttribute("src"));
    }
  }, []);

  const broken = !image || failedSrc === image;
  const box = `shrink-0 rounded-full ${className}`;
  const style = { width: size, height: size };

  if (broken) {
    return (
      <span
        style={{
          ...style,
          ...(variant === "tint" ? { backgroundColor: tintFor(name) } : {}),
        }}
        title={name}
        className={`flex items-center justify-center ${box} ${
          variant === "tint"
            ? "font-bold text-[#0e1217]"
            : "bg-[#243033] font-semibold text-[#e2e8f0]"
        }`}
      >
        {/* Scaled off the box so one component serves the 32px sidebar chip and
            the 34px note card without either caller passing a type size. */}
        <span style={{ fontSize: Math.round(size * 0.36) }}>
          {initialsOf(name)}
        </span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // Remounts on a new URL, so `settle` re-runs and an avatar that starts
      // working again is shown again.
      key={image}
      ref={settle}
      src={image}
      alt=""
      title={name}
      style={style}
      onError={() => setFailedSrc(image)}
      className={`object-cover ${box}`}
    />
  );
}

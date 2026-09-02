"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, SearchX } from "lucide-react";
import { search, type SettingsFacts } from "./settings-index";

// The settings hub. The old one had no landing page at all: /settings redirected
// into the middle of the Discord bot config, so the only way to find a setting
// was to already know which of five rows was hiding it.
//
// Two things fix that here. Every group is on one screen with its live numbers
// on it, and the search runs over individual settings rather than page titles,
// so an admin can type what they want ("token", "5%", "reset") instead of
// guessing our grouping. When the match is on a setting rather than the group,
// the card names it, which is the actual answer to "where does this live".

export default function SettingsOverview({ facts }: { facts: SettingsFacts }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => search(query), [query]);
  const searching = query.trim().length > 0;

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <div className="flex items-start justify-between gap-[24px]">
        <div className="flex min-w-0 flex-col gap-[6px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Settings</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Everything an admin can configure, and where it lives
          </p>
        </div>
      </div>

      <div className="flex items-center gap-[10px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[12px] transition-colors focus-within:border-[#8fb0a7]!">
        <Search size={16} strokeWidth={2} className="shrink-0 text-[#64748b]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search settings"
          placeholder="Search settings, e.g. token, ticket rate, invite, reset"
          className="min-w-0 flex-1 bg-transparent text-[14px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
        />
        {searching ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="shrink-0 cursor-pointer text-[12px] font-semibold text-[#94a3b8] transition-colors hover:text-[#e2e8f0]"
          >
            Clear
          </button>
        ) : null}
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[48px]">
          <span className="rounded-full bg-[#0e1217] p-[16px]">
            <SearchX size={24} strokeWidth={2} className="text-[#64748b]" />
          </span>
          <div className="flex flex-col items-center gap-[6px] text-center">
            <p className="text-[15px] font-semibold text-[#e2e8f0]">
              Nothing matches &ldquo;{query.trim()}&rdquo;
            </p>
            <p className="text-[13px] font-normal text-[#64748b]">
              Try the thing you want to change, like &ldquo;bonus&rdquo;,
              &ldquo;channel&rdquo; or &ldquo;admin&rdquo;.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[16px]">
          {matches.map(({ group, hits }) => {
            const Icon = group.icon;
            return (
              <Link
                key={group.id}
                href={group.href}
                className="group flex flex-col gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px] transition-colors hover:border-[#8fb0a7]!"
              >
                <div className="flex items-start justify-between gap-[12px]">
                  <span className="shrink-0 rounded-[10px] bg-[#0e1217] p-[12px]">
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className="text-[#8fb0a7]"
                    />
                  </span>
                  <ArrowUpRight
                    size={16}
                    strokeWidth={2}
                    className="shrink-0 text-[#64748b] transition-colors group-hover:text-[#8fb0a7]"
                  />
                </div>

                <div className="flex flex-col gap-[6px]">
                  <p className="text-[16px] font-bold text-[#e2e8f0]">
                    {group.label}
                  </p>
                  <p className="text-[13px] font-normal text-[#94a3b8]">
                    {group.description}
                  </p>
                </div>

                {/* Search hits take the card over: when someone typed "token"
                    the useful thing to show is "Bot token", not the headcount. */}
                {hits.length > 0 ? (
                  <div className="flex flex-wrap gap-[6px]">
                    {hits.map((hit) => (
                      <span
                        key={hit}
                        className="rounded-[6px] bg-[#8fb0a7]/15 px-[8px] py-[3px] text-[11px] font-semibold text-[#8fb0a7]"
                      >
                        {hit}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-[6px]">
                    {(facts[group.id] ?? []).map((fact) => (
                      <span
                        key={fact}
                        className="rounded-[6px] bg-[#0e1217] px-[8px] py-[3px] text-[11px] font-semibold text-[#94a3b8]"
                      >
                        {fact}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-auto pt-[4px] text-[11px] font-normal text-[#64748b]">
                  {group.elsewhere
                    ? `Lives ${group.elsewhere}`
                    : `${group.contains.length} settings`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

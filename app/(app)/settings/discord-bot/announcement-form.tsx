"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { updateAnnouncement } from "./actions";

type Announcement = {
  announcementChannelId: string;
  announcementEnabled: boolean;
  announcementTitle: string;
  announcementColor: string;
  announcementIntro: string;
  announcementFooter: string;
  announcementRoleId: string;
  announcementPingText: string;
};

const label = "mb-1.5 block text-xs font-medium text-muted";
const field =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none focus:border-muted";

export default function AnnouncementForm({ announcement }: { announcement: Announcement }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(announcement.announcementEnabled);
  const [channelId, setChannelId] = useState(announcement.announcementChannelId);
  const [title, setTitle] = useState(announcement.announcementTitle);
  const [color, setColor] = useState(
    /^#[0-9a-fA-F]{6}$/.test(announcement.announcementColor)
      ? announcement.announcementColor
      : "#5865f2",
  );
  const [intro, setIntro] = useState(announcement.announcementIntro);
  const [footer, setFooter] = useState(announcement.announcementFooter);
  const [roleId, setRoleId] = useState(announcement.announcementRoleId);
  const [pingText, setPingText] = useState(announcement.announcementPingText);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateAnnouncement({
        announcementChannelId: channelId.trim(),
        announcementEnabled: enabled,
        announcementTitle: title,
        announcementColor: color,
        announcementIntro: intro,
        announcementFooter: footer,
        announcementRoleId: roleId.trim(),
        announcementPingText: pingText,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Post a leaderboard announcement</p>
          <p className="text-xs text-muted">
            When a report runs, post a ranked ticket leaderboard to the announcement channel.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`inline-flex h-6 w-11 shrink-0 items-center border transition-colors ${
            enabled ? "border-emerald-500/60 bg-emerald-500/30" : "border-border bg-surface-2"
          }`}
        >
          <span
            className={`h-4 w-4 bg-foreground transition-transform ${
              enabled ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div>
        <label className={label} htmlFor="annChannel">
          Announcement channel ID
        </label>
        <input
          id="annChannel"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="123456789012345678"
          className={`${field} font-mono`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label className={label} htmlFor="annTitle">
            Embed title
          </label>
          <input
            id="annTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ticket count for this period"
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="annColor">
            Accent color
          </label>
          <div className="flex h-9 items-center gap-2 border border-border bg-surface-2 px-2">
            <input
              id="annColor"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
            />
            <span className="font-mono text-xs text-muted">{color}</span>
          </div>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="annIntro">
          Intro line (optional)
        </label>
        <textarea
          id="annIntro"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={2}
          placeholder="Shown above the leaderboard, e.g. Great work this period, team!"
          className="w-full resize-none border border-border bg-surface-2 px-3 py-2 text-sm leading-6 text-foreground outline-none focus:border-muted"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
          <div>
            <label className={label} htmlFor="annRole">
              Ping role ID (optional)
            </label>
            <input
              id="annRole"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              inputMode="numeric"
              placeholder="123456789012345678"
              className={`${field} font-mono`}
            />
          </div>
          <div>
            <label className={label} htmlFor="annPing">
              Message (above embed)
            </label>
            <input
              id="annPing"
              value={pingText}
              onChange={(e) => setPingText(e.target.value)}
              placeholder="Great job this period, {role}"
              className={field}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          Posted as the line above the embed.{" "}
          <code className="font-mono text-foreground">{"{role}"}</code> becomes the
          ping-role mention (leave the role blank for a plain message). A role
          mention only notifies from here, never from inside the embed, so a
          non-mentionable role needs the bot&apos;s &quot;Mention @everyone, @here,
          and All Roles&quot; permission.
        </p>
      </div>

      <div>
        <label className={label} htmlFor="annFooter">
          Footer
        </label>
        <input
          id="annFooter"
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder="Team Guide"
          className={field}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {error ? (
          <span className="text-xs text-red-400">{error}</span>
        ) : (
          <span className="text-xs text-muted">
            Ranks every report channel by tickets, like #1 Name - 12 tickets.
          </span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn-wipe btn-wipe-dark relative flex h-9 shrink-0 items-center justify-center border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          <span className={`flex items-center gap-2 ${pending ? "invisible" : ""}`}>
            {saved ? <Check size={15} strokeWidth={2} /> : null}
            {saved ? "Saved" : "Save announcement"}
          </span>
          {pending ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={15} strokeWidth={2} className="animate-spin" />
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { updateAnnouncement } from "@/lib/actions/bot";
import { Field, SaveBar, Toggle, useAction } from "../../settings-controls";

// The announcement embed. The ranking itself is generated, so everything here is
// its dressing, which is why the preview sits beside the fields: it is the only
// way to see what the settings add up to.

export type Announcement = {
  announcementChannelId: string;
  announcementEnabled: boolean;
  announcementTitle: string;
  announcementColor: string;
  announcementIntro: string;
  announcementFooter: string;
  announcementRoleId: string;
  announcementPingText: string;
};

export default function AnnouncementForm({
  initial,
}: {
  initial: Announcement;
}) {
  const { run, pending, error, saved } = useAction();
  const [form, setForm] = useState<Announcement>(initial);

  const set = <K extends keyof Announcement>(key: K, value: Announcement[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const dirty = (Object.keys(initial) as (keyof Announcement)[]).some(
    (k) => form[k] !== initial[k],
  );

  // The mention goes where {role} is, or in front when the placeholder is
  // missing, which is what the bot does when it posts.
  const ping = form.announcementRoleId
    ? form.announcementPingText.includes("{role}")
      ? form.announcementPingText.replace("{role}", "@role")
      : `@role ${form.announcementPingText}`.trim()
    : null;

  const colour = /^#?[0-9a-fA-F]{6}$/.test(form.announcementColor.trim())
    ? form.announcementColor.trim().replace(/^#?/, "#")
    : "#5865f2";

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex items-start gap-[20px]">
      <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
        <Toggle
          label="Post the announcement"
          hint="Off means a report runs without the embed"
          checked={form.announcementEnabled}
          disabled={pending}
          onChange={(v) => set("announcementEnabled", v)}
        />

        <Field
          id="ann-channel"
          label="Channel ID"
          hint="Right-click the channel in Discord and copy its ID"
          value={form.announcementChannelId}
          disabled={pending}
          placeholder="1227985009378332742"
          onChange={(v) => set("announcementChannelId", v)}
        />

        <Field
          id="ann-title"
          label="Title"
          value={form.announcementTitle}
          disabled={pending}
          onChange={(v) => set("announcementTitle", v)}
        />

        <Field
          id="ann-colour"
          label="Colour"
          hint="A 6-digit hex, like #5865f2"
          value={form.announcementColor}
          disabled={pending}
          placeholder="#5865f2"
          onChange={(v) => set("announcementColor", v)}
        />

        <Field
          id="ann-intro"
          label="Intro line"
          hint="Sits above the ranking. Leave empty for none."
          value={form.announcementIntro}
          disabled={pending}
          onChange={(v) => set("announcementIntro", v)}
        />

        <Field
          id="ann-footer"
          label="Footer"
          value={form.announcementFooter}
          disabled={pending}
          onChange={(v) => set("announcementFooter", v)}
        />

        <Field
          id="ann-role"
          label="Ping role ID"
          hint="Leave empty for no ping. A mention inside an embed never notifies, so it is posted above."
          value={form.announcementRoleId}
          disabled={pending}
          placeholder="1158481368238526524"
          onChange={(v) => set("announcementRoleId", v)}
        />

        <Field
          id="ann-ping-text"
          label="Ping line"
          hint="Use {role} to place the mention. Without it the mention goes first."
          value={form.announcementPingText}
          disabled={pending || !form.announcementRoleId}
          placeholder="Great job this period, {role}"
          onChange={(v) => set("announcementPingText", v)}
        />

        <SaveBar
          pending={pending}
          error={error}
          saved={saved}
          disabled={!dirty}
          hint="Posted when a report runs, not on its own."
          onSave={() => run(() => updateAnnouncement(form))}
        />
      </div>

      <div className="flex w-[340px] shrink-0 flex-col gap-[10px]">
        <p className="text-[12px] font-bold text-[#8fb0a7] uppercase">
          Preview
        </p>

        {ping ? (
          <p className="text-[13px] font-normal text-[#94a3b8]">
            <span className="rounded-[4px] bg-[#8fb0a7]/15 px-[4px] py-[1px] font-semibold text-[#8fb0a7]">
              {ping}
            </span>
          </p>
        ) : null}

        <div className="flex gap-[12px] rounded-[6px] bg-[#0e1217] p-[16px]">
          <span
            style={{ backgroundColor: colour }}
            className="w-[4px] shrink-0 rounded-full"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
            <p className="text-[15px] font-bold text-[#e2e8f0]">
              {form.announcementTitle.trim() || "Ticket count for this period"}
            </p>
            {form.announcementIntro.trim() ? (
              <p className="text-[13px] font-normal text-[#94a3b8]">
                {form.announcementIntro.trim()}
              </p>
            ) : null}
            <div className="flex flex-col gap-[4px] text-[13px] font-normal text-[#94a3b8]">
              <p>1. A member, 128</p>
              <p>2. Another member, 96</p>
              <p>3. A third member, 74</p>
            </div>
            {form.announcementFooter.trim() ? (
              <p className="pt-[4px] text-[11px] font-normal text-[#64748b]">
                {form.announcementFooter.trim()}
              </p>
            ) : null}
          </div>
        </div>

        {!form.announcementEnabled ? (
          <p className="text-[12px] font-normal text-[#64748b]">
            Switched off, so a report runs without it.
          </p>
        ) : null}
      </div>
    </div>
  );
}

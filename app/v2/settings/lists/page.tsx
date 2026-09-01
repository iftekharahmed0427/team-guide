import { asc } from "drizzle-orm";
import { List } from "lucide-react";
import { db } from "@/db";
import {
  disputeCategory,
  paymentRole,
  reviewSource,
} from "@/db/app-schema";
import { CARD, EditsOn, SettingsHeader, Section, Tag } from "../settings-ui";

// /v2/settings/lists - the three option lists on one page.
//
// The live settings give each of these its own nav row and its own page, which
// makes the settings look three times bigger than they are: all three are the
// same "add, rename, remove" list, and each one exists only to fill a picker
// somewhere else. Together they are one screen.
//
// Read-only, like the rest of v2 settings. Each list says where it is used and
// links to the live page that edits it.

type Entry = { id: string; name: string; tags?: { label: string }[] };

function ListCard({
  title,
  hint,
  entries,
  empty,
  editsHref,
  editsLabel,
  usedOn,
}: {
  title: string;
  hint: string;
  entries: Entry[];
  empty: string;
  editsHref: string;
  editsLabel: string;
  usedOn: string;
}) {
  return (
    <Section title={title} hint={hint} footer={usedOn}>
      {entries.length === 0 ? (
        <p className="py-[8px] text-[13px] font-normal text-[#64748b]">
          {empty}
        </p>
      ) : (
        <div className="flex flex-col">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-[12px] border-b border-[#243033]! py-[12px] first:pt-0 last:border-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-[10px]">
                <span className="w-[18px] shrink-0 text-[12px] font-normal text-[#64748b] tabular-nums">
                  {i + 1}
                </span>
                <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">
                  {entry.name}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-[6px]">
                {(entry.tags ?? []).map((tag) => (
                  <Tag key={tag.label} tone="accent">
                    {tag.label}
                  </Tag>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-[16px]">
        <EditsOn href={editsHref} label={editsLabel} />
      </div>
    </Section>
  );
}

export default async function V2SettingsListsPage() {
  const [roles, categories, sources] = await Promise.all([
    db.select().from(paymentRole).orderBy(asc(paymentRole.sortOrder)),
    db.select().from(disputeCategory).orderBy(asc(disputeCategory.sortOrder)),
    db.select().from(reviewSource).orderBy(asc(reviewSource.sortOrder)),
  ]);

  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <SettingsHeader
        title="Lists"
        subtitle="The option lists behind the pickers across the portal"
      />

      <div className="flex items-start gap-[16px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
          <ListCard
            title="Payment roles"
            hint="What each member is paid for. A role either earns per ticket or a flat base."
            entries={roles.map((r) => ({
              id: r.id,
              name: r.name,
              tags: [
                ...(r.paidPerTicket ? [{ label: "Per ticket" }] : []),
                ...(r.bonusEligible ? [{ label: "Recovered revenue" }] : []),
              ],
            }))}
            empty="No roles yet. Members without one are paid per ticket."
            editsHref="/settings/payment-roles"
            editsLabel="Edit on the live settings"
            usedOn="Used by the Role column on Payments."
          />

          <ListCard
            title="Review sources"
            hint="Where a review came from. Renaming one relabels it on existing reviews too."
            entries={sources.map((s) => ({ id: s.id, name: s.name }))}
            empty="No sources yet."
            editsHref="/settings/review-sources"
            editsLabel="Edit on the live settings"
            usedOn="Used by the Source picker when logging a review."
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
          <ListCard
            title="Dispute categories"
            hint="Why a payment was disputed."
            entries={categories.map((c) => ({ id: c.id, name: c.name }))}
            empty="No categories yet."
            editsHref="/settings/dispute-categories"
            editsLabel="Edit on the live settings"
            usedOn="Used by the Category picker when logging a dispute."
          />

          <div className={`flex flex-col gap-[8px] p-[20px] ${CARD}`}>
            <div className="flex items-center gap-[10px]">
              <List size={16} strokeWidth={2} className="text-[#64748b]" />
              <p className="text-[14px] font-semibold text-[#e2e8f0]">
                Games are a list too
              </p>
            </div>
            <p className="text-[13px] font-normal text-[#94a3b8]">
              The game list behind guide categories and the specialists matrix
              works the same way, but it is edited where it is used.
            </p>
            <div className="pt-[4px]">
              <EditsOn href="/v2/specialists" label="Open Specialists" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

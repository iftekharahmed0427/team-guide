import { asc } from "drizzle-orm";
import { List } from "lucide-react";
import { db } from "@/db";
import { disputeCategory, paymentRole, reviewSource } from "@/db/app-schema";
import { CARD, EditsOn, SettingsHeader, Section } from "../settings-ui";
import { CategoriesManager, RolesManager, SourcesManager } from "./managers";

// /v2/settings/lists - the three option lists on one page.
//
// The live settings give each of these its own nav row and its own page, which
// makes the settings look three times bigger than they are: all three are the
// same "add, rename, remove" list, and each exists only to fill a picker
// somewhere else. Together they are one screen.
//
// Wired to the live actions, so a change here is the same write the old pages
// made, with the same activity log entry.

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
          <Section
            title="Payment roles"
            hint="What each member is paid for. Tap a tag to change how a role is paid."
            footer="Used by the Role column on Payments."
          >
            <RolesManager
              entries={roles.map((r) => ({
                id: r.id,
                name: r.name,
                flags: [
                  {
                    key: "paidPerTicket",
                    label: "Per ticket",
                    hint: "Members on this role earn ticket pay on top of their base",
                    value: r.paidPerTicket,
                  },
                  {
                    key: "bonusEligible",
                    label: "Recovered revenue",
                    hint: "Members on this role get the recovered revenue field",
                    value: r.bonusEligible,
                  },
                ],
              }))}
            />
          </Section>

          <Section
            title="Review sources"
            hint="Where a review came from."
            footer="Used by the Source picker when logging a review."
          >
            <SourcesManager
              entries={sources.map((s) => ({ id: s.id, name: s.name }))}
            />
          </Section>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
          <Section
            title="Dispute categories"
            hint="Why a payment was disputed."
            footer="Used by the Category picker when logging a dispute."
          >
            <CategoriesManager
              entries={categories.map((c) => ({ id: c.id, name: c.name }))}
            />
          </Section>

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

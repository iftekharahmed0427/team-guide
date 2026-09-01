import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SettingsRail from "./settings-rail";

// The settings shell: the group rail beside whatever page is open. The rail
// hides itself on the overview, which is the hub rather than one of the groups.
//
// Admin-gated, the way the live settings layout is. This matters more here than
// it did on the rest of v2: these pages write now, so the gate is what stands
// between a member and the bot token. Every action underneath re-checks the
// role server-side, and this only keeps non-admins from seeing the screens.

export default async function V2SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/v2");

  return (
    <div className="flex min-h-full items-stretch">
      <SettingsRail />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

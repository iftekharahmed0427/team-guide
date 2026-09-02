import { redirect } from "next/navigation";
import { getRealSession, getSession, isViewingAsMember } from "@/lib/auth";
import { canAccessDisputes } from "@/lib/disputes";
import Sidebar from "@/app/components/sidebar";
import LiveRefresh from "@/app/components/live-refresh";
import ViewAsBanner from "@/app/components/view-as-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use the REAL session here so the sidebar can offer the admin "view as member"
  // toggle even while the preview is active; pages and actions still go through
  // getSession(), which applies the downgrade.
  const session = await getRealSession();

  if (!session) {
    redirect("/sign-in");
  }

  const viewingAsMember = await isViewingAsMember();
  // Gate the Disputes nav item to admins + Disputes-role members. Use the
  // effective session (getSession applies the "view as member" downgrade) so the
  // nav matches what the /disputes page itself allows.
  const canSeeDisputes = await canAccessDisputes(await getSession());

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <LiveRefresh />
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
        viewingAsMember={viewingAsMember}
        canSeeDisputes={canSeeDisputes}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {viewingAsMember ? <ViewAsBanner /> : null}
        {children}
      </div>
    </div>
  );
}

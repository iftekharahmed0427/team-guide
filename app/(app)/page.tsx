import { getSession } from "@/lib/auth";
import { getDashboard } from "./dashboard-data";
import { getNotices } from "./notifications-data";
import Dashboard from "./dashboard";

// The dashboard. Auth-gated in production by proxy.ts, which matches every
// route except sign-in and static files, and again by the layout, which
// re-validates the session on the server. The shell (sidebar + scrolling main)
// lives in layout.tsx.
export default async function DashboardPage() {
  const [session, data, notices] = await Promise.all([
    getSession(),
    getDashboard(),
    getNotices(),
  ]);

  return (
    <Dashboard
      data={data}
      notices={notices}
      isAdmin={session?.user.role === "admin"}
      currentUserId={session?.user.id ?? ""}
    />
  );
}

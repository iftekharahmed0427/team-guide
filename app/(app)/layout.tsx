import { Figtree } from "next/font/google";
import { redirect } from "next/navigation";
import { getRealSession, getSession, isViewingAsMember } from "@/lib/auth";
import { canAccessDisputes } from "@/lib/disputes";
import LiveRefresh from "@/app/components/live-refresh";
import Sidebar from "./sidebar";
import SearchPalette from "./search-palette";

// The app is typeset in Figtree. Set on this wrapper rather than on <body>,
// which globals.css puts on Geist for the sign-in page; a font class here beats
// that inherited family for everything underneath.
//
// globals.css also leaves body on a 1.5 line-height while the frames set every
// text node to `normal`, so the whole subtree opts out here rather than per node.
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

// The app shell: sidebar plus the scrolling workspace. Lives in the layout so
// every route shares it and only the main area swaps on navigation.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // The real session check. proxy.ts only looks for the presence of a session
  // cookie, which it documents as optimistic. In development lib/auth hands back
  // a stub session, so this never fires locally.
  if (!session) {
    redirect("/sign-in");
  }

  // Which rows the sidebar offers. Disputes is open to admins and to members on
  // the Disputes payment role, the same rule /disputes enforces.
  const isAdmin = session.user.role === "admin";
  const canSeeDisputes = await canAccessDisputes(session);

  // The real role, which the preview does not touch, so an admin who has
  // downgraded their own view can still find the way back out.
  const [real, viewingAsMember] = await Promise.all([
    getRealSession(),
    isViewingAsMember(),
  ]);

  return (
    <div
      className={`${figtree.className} flex h-screen w-full overflow-hidden bg-[#0e1217] leading-[normal]`}
    >
      {/* The whole app is live: one SSE subscription re-renders the current
          route whenever anything changes. */}
      <LiveRefresh />
      <Sidebar
        isAdmin={isAdmin}
        canSeeDisputes={canSeeDisputes}
        realAdmin={real?.user.role === "admin"}
        viewingAsMember={viewingAsMember}
        user={{
          name: session?.user.name || "Member",
          email: session?.user.email || "",
          image: session?.user.image ?? null,
        }}
      />
      {/* v2-rail gives the workspace the sidebar's 2px rail instead of the
          app-wide 10px scrollbar from globals.css. */}
      <main className="v2-rail flex-1 overflow-y-auto">{children}</main>

      {/* Mounted here rather than on the dashboard so Cmd/Ctrl+K reaches it
          from any page. */}
      <SearchPalette />
    </div>
  );
}

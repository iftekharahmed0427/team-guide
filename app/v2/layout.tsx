import { Figtree } from "next/font/google";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import V2Sidebar from "./v2-sidebar";
import V2SearchPalette from "./search-palette";

// The redesign is typeset in Figtree. Scoped to /v2 so the rest of the app keeps
// Geist, which globals.css sets on <body>; a font class on this wrapper beats
// that inherited family for everything underneath.
//
// globals.css also leaves body on a 1.5 line-height while the frames set every
// text node to `normal`, so the whole subtree opts out here rather than per node.
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

// The v2 shell: sidebar plus the scrolling workspace. Lives in the layout so
// every v2 route shares it and only the main area swaps on navigation.
export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Now that /v2 serves real content, it re-validates the session the way the
  // (app) layout does. proxy.ts only checks that a session cookie is present,
  // which it documents as optimistic. In development lib/auth hands back a stub
  // session, so this never fires locally.
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div
      className={`${figtree.className} flex h-screen w-full overflow-hidden bg-[#0e1217] leading-[normal]`}
    >
      <V2Sidebar
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
          from any v2 page. */}
      <V2SearchPalette />
    </div>
  );
}

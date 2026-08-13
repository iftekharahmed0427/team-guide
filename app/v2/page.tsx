import { getSession } from "@/lib/auth";
import V2Sidebar from "./v2-sidebar";

// /v2 - the canvas for the full redesign. Deliberately outside the (app) route
// group so it does not inherit the current sidebar layout; it renders on the
// root layout only (fonts + globals.css). Still auth-gated in production by
// proxy.ts, which matches every route except sign-in and static files.
//
// globals.css paints the body dark and defaults every border to the dark token,
// so v2 sets its own surface colors explicitly rather than using the app tokens.
export default async function V2Page() {
  const session = await getSession();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f7f8fa]">
      <V2Sidebar
        user={{
          name: session?.user.name || "Member",
          email: session?.user.email || "",
          image: session?.user.image ?? null,
        }}
      />
      <main className="flex flex-1 items-center justify-center overflow-y-auto">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-tight text-slate-900">v2</p>
          <p className="mt-1 text-xs text-slate-500">Redesign canvas</p>
        </div>
      </main>
    </div>
  );
}

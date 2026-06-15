import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Box } from "lucide-react";
import { auth } from "@/lib/auth";
import SignInButton from "./sign-in-button";

export default async function SignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="fx-rise w-full max-w-sm border border-border bg-surface p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-border bg-surface-2">
            <Box size={18} strokeWidth={1.75} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Team Guide</p>
            <p className="text-[11px] text-muted">Workspace</p>
          </div>
        </div>

        <h1 className="mt-8 text-lg font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          Use your Discord account to access the team workspace.
        </p>

        <div className="mt-6">
          <SignInButton />
        </div>

        <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted">
          Access is invite only. If you cannot sign in, ask an admin to add you to
          the team.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";

// The one control on the sign-in page. Discord is the only provider: access is
// invite-only, and lib/auth matches the Discord account's email against the
// invite list when the user row is created.

export default function SignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    const result = await authClient.signIn.social({
      provider: "discord",
      callbackURL: "/",
    });
    // On success the browser leaves for Discord, so this only runs when the
    // request never got that far.
    if (result.error) {
      setError(result.error.message ?? "Could not start sign in. Try again.");
      setLoading(false);
    }
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[12px]">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] bg-[#8fb0a7] px-[16px] py-[12px] text-[14px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : (
          <LogIn size={16} strokeWidth={2} />
        )}
        {loading ? "Opening Discord" : "Continue with Discord"}
      </button>

      {error ? (
        <p className="flex items-start gap-[8px] rounded-[8px] border border-[#ef4444]/40! bg-[#ef4444]/[0.06] px-[14px] py-[10px] text-[13px] font-medium text-[#ef4444]">
          <AlertCircle
            size={14}
            strokeWidth={2}
            className="mt-[2px] shrink-0"
          />
          {error}
        </p>
      ) : null}
    </div>
  );
}

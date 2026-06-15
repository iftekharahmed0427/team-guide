"use client";

import { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

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
    if (result.error) {
      setError(result.error.message ?? "Could not start sign in. Try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="btn-wipe btn-wipe-dark flex h-10 w-full items-center justify-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : (
          <LogIn size={16} strokeWidth={2} />
        )}
        Continue with Discord
      </button>
      {error ? (
        <p className="mt-3 border border-red-500/40 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

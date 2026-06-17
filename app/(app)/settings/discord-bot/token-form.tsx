"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, Asterisk } from "lucide-react";
import { setBotToken, clearBotToken } from "./actions";

export default function TokenForm({
  hasToken,
  tokenLast4,
}: {
  hasToken: boolean;
  tokenLast4: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(!hasToken);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    const token = value.trim();
    if (!token) {
      setError("Paste a token first.");
      return;
    }
    startTransition(async () => {
      const res = await setBotToken(token);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setValue("");
      setEditing(false);
      setSaved(true);
      router.refresh();
    });
  }

  function clear() {
    setError(null);
    startTransition(async () => {
      const res = await clearBotToken();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setValue("");
      setEditing(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {hasToken && !editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm">
            <KeyRound size={15} strokeWidth={1.75} className="text-emerald-400" />
            Token set
            <span className="inline-flex items-center gap-1 text-muted">
              <span className="flex items-center text-muted/70">
                {[0, 1, 2, 3].map((i) => (
                  <Asterisk key={i} size={11} strokeWidth={2.5} />
                ))}
              </span>
              <span className="font-mono">{tokenLast4}</span>
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn-wipe border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={pending}
              className="border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              placeholder="Paste the bot token"
              className="h-9 flex-1 border border-border bg-surface-2 px-3 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted focus:border-muted"
            />
            <button
              type="button"
              onClick={save}
              disabled={pending || !value.trim()}
              className="btn-wipe btn-wipe-dark relative flex h-9 shrink-0 items-center justify-center border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
            >
              <span className={pending ? "invisible" : ""}>Save token</span>
              {pending ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={15} strokeWidth={2} className="animate-spin" />
                </span>
              ) : null}
            </button>
          </div>
          {hasToken ? (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue("");
                setError(null);
              }}
              className="self-start text-xs text-muted underline-offset-2 hover:underline"
            >
              Cancel
            </button>
          ) : null}
        </>
      )}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}

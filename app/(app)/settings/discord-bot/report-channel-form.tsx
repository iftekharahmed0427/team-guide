"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import CustomSelect from "@/app/components/custom-select";
import { addReportChannel } from "./actions";

type Member = { discordId: string; name: string };

export default function ReportChannelForm({ members }: { members: Member[] }) {
  const router = useRouter();
  const [channelId, setChannelId] = useState("");
  const [userId, setUserId] = useState(""); // Discord id, or "" for everyone
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const options = [
    { value: "", label: "Anyone (count all uploads)" },
    ...members.map((m) => ({ value: m.discordId, label: m.name })),
  ];

  function submit() {
    setError(null);
    const cid = channelId.trim();
    if (!cid) {
      setError("Channel ID is required.");
      return;
    }
    const name = members.find((m) => m.discordId === userId)?.name ?? "";
    startTransition(async () => {
      const res = await addReportChannel({
        channelId: cid,
        userId: userId || null,
        name,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setChannelId("");
      setUserId("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          inputMode="numeric"
          placeholder="Report channel ID (e.g. 1110000000000000000)"
          className="h-9 flex-1 border border-border bg-surface-2 px-3 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted focus:border-muted"
        />
        <CustomSelect
          name="member"
          options={options}
          defaultValue=""
          onChange={setUserId}
          className="w-full sm:w-56"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !channelId.trim()}
          className="btn-wipe btn-wipe-dark flex h-9 shrink-0 items-center justify-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            {pending ? (
              <Loader2 size={15} strokeWidth={2} className="animate-spin" />
            ) : (
              <Plus size={15} strokeWidth={2} />
            )}
          </span>
          Add
        </button>
      </div>
      {error ? (
        <span className="text-xs text-red-400">{error}</span>
      ) : (
        <span className="text-xs text-muted">
          Enable Developer Mode in Discord, then right-click the channel → Copy ID.
        </span>
      )}
    </div>
  );
}

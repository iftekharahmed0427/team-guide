"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Check, ImageUp, X, Trash2, Gavel } from "lucide-react";
import CustomSelect from "@/app/components/custom-select";
import { imageToDataUrl, imageFilesFrom } from "@/app/components/editor-images";
import { formatUSD } from "@/app/(app)/payments/constants";
import { createDispute, deleteDispute } from "./actions";

// Keep in sync with DISPUTE_BONUS_RATE in lib/disputes.ts (that module is
// server-only, so the rate is mirrored here for the live preview / column).
const BONUS_RATE = 0.05;

export type DisputeItem = {
  id: string;
  email: string;
  category: string;
  amount: number;
  src: string; // resolved (presigned or inline) screenshot URL
  submittedById: string | null;
  submittedByName: string;
  when: string;
};

const labelCls = "mb-1 block text-xs text-muted";
const inputCls =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40";

export default function DisputesClient({
  categories,
  items,
  isAdmin,
  currentUserId,
}: {
  categories: { id: string; name: string }[];
  items: DisputeItem[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "");
  const [amount, setAmount] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    setError(null);
    try {
      setImage(await imageToDataUrl(f, 1400));
    } catch {
      setError("Couldn't read that image.");
    }
  }

  function submit() {
    setError(null);
    setDone(false);
    if (!image) return setError("Attach a screenshot of the dispute first.");
    const amt = Math.round((Number(amount) || 0) * 100) / 100;
    startTransition(async () => {
      const res = await createDispute({ email, category, amount: amt, imageUrl: image });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setEmail("");
      setAmount("");
      setImage(null);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this dispute? This also removes its 5% from the bonus.")) return;
    startTransition(async () => {
      const res = await deleteDispute(id);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  const previewBonus = Math.round((Number(amount) || 0) * BONUS_RATE * 100) / 100;

  return (
    <>
      {/* Log a dispute */}
      <div
        className="border border-border bg-surface p-4"
        onPaste={(e) => {
          const files = imageFilesFrom(e.clipboardData);
          if (files.length > 0) {
            e.preventDefault();
            void handleFiles(files);
          }
        }}
      >
        <p className="mb-3 text-sm font-medium">Log a dispute</p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className={labelCls}>Customer email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <CustomSelect
              key={categories.map((c) => c.id).join(",")}
              name="category"
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              defaultValue={category}
              onChange={setCategory}
              className="w-full"
            />
          </div>
          <div>
            <label className={labelCls}>Amount (USD)</label>
            <div className="flex items-center gap-1">
              <span className="text-muted">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Adds {formatUSD(previewBonus)} (5%) to the bonus
            </p>
          </div>
        </div>

        <div className="mt-3">
          <label className={labelCls}>Screenshot</label>
          {image ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Dispute screenshot" className="max-h-44 border border-border" />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove screenshot"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center border border-border bg-surface text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-24 w-full cursor-pointer items-center justify-center gap-2 border border-dashed border-border text-sm text-muted transition-colors hover:border-muted hover:text-foreground"
            >
              <ImageUp size={16} strokeWidth={1.75} />
              Choose a screenshot, or paste one
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          {error ? (
            <span className="text-xs text-red-400">{error}</span>
          ) : done ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check size={13} strokeWidth={2} />
              Dispute logged
            </span>
          ) : (
            <span className="text-xs text-muted">5% of the amount is added to your bonus this period.</span>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || !image}
            className="btn-wipe btn-wipe-dark flex h-9 shrink-0 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
          >
            {pending ? (
              <Loader2 size={15} strokeWidth={2} className="animate-spin" />
            ) : (
              <Plus size={15} strokeWidth={2} />
            )}
            Log dispute
          </button>
        </div>
      </div>

      {/* This period's disputes */}
      <h2 className="px-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted">
        This period&apos;s disputes
      </h2>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border border-border bg-surface px-5 py-16 text-center">
          <Gavel size={22} strokeWidth={1.5} className="text-muted" />
          <p className="text-sm text-muted">No disputes logged yet this period.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto border border-border bg-surface">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="h-11 px-4 text-left align-middle font-medium">Shot</th>
                <th className="h-11 px-4 text-left align-middle font-medium">Customer</th>
                <th className="h-11 px-4 text-left align-middle font-medium">Category</th>
                <th className="h-11 px-4 text-right align-middle font-medium">Amount</th>
                <th className="h-11 px-4 text-right align-middle font-medium">Bonus</th>
                <th className="h-11 px-4 text-left align-middle font-medium">Logged by</th>
                <th className="h-11 px-4 text-right align-middle font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const canDelete = isAdmin || d.submittedById === currentUserId;
                return (
                  <tr key={d.id} className="border-b border-border transition-colors hover:bg-surface-2">
                    <td className="h-14 px-4 align-middle">
                      {d.src ? (
                        <button
                          type="button"
                          onClick={() => setLightbox(d.src)}
                          className="block h-9 w-12 overflow-hidden border border-border"
                          aria-label="View screenshot"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={d.src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted">-</span>
                      )}
                    </td>
                    <td className="h-14 px-4 align-middle">{d.email}</td>
                    <td className="h-14 px-4 align-middle">
                      <span className="border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
                        {d.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="h-14 px-4 text-right align-middle tabular-nums">{formatUSD(d.amount)}</td>
                    <td className="h-14 px-4 text-right align-middle tabular-nums text-muted">
                      +{formatUSD(Math.round(d.amount * BONUS_RATE * 100) / 100)}
                    </td>
                    <td className="h-14 px-4 align-middle text-muted">
                      <span className="text-foreground">{d.submittedByName || "Member"}</span>
                      <span className="block text-[11px]">{d.when}</span>
                    </td>
                    <td className="h-14 px-4 text-right align-middle">
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => remove(d.id)}
                          disabled={pending}
                          aria-label="Delete dispute"
                          className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-red-400 disabled:opacity-50"
                        >
                          <Trash2 size={15} strokeWidth={1.75} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Screenshot lightbox */}
      {lightbox ? (
        <div
          className="fx-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Dispute screenshot"
            className="max-h-[85vh] max-w-[90vw] border border-border"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-border bg-surface text-muted transition-colors hover:text-foreground"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </>
  );
}

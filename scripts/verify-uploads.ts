// Verify that every screenshot the database references actually exists on disk.
//
// Run this after copying the storage bucket onto the VPS, BEFORE deleting
// anything upstream. Exit code 1 means at least one referenced file is missing,
// so it is safe to use as a gate in a cutover script.
//
//   STORAGE_DIR=/srv/teamguide/data/uploads \
//     bun --env-file=.env run scripts/verify-uploads.ts
//
// Rows hold either an object key (`reviews/<uuid>.png`) or a legacy inline
// `data:` URL from before storage was configured. Inline rows carry their own
// image, so they are counted and skipped rather than checked.
import { access } from "node:fs/promises";
import { db } from "../db";
import { review, auditScreenshot, dispute } from "../db/app-schema";
import { resolveKey, storageEnabled } from "../lib/storage";

type Ref = { table: string; id: string; key: string };

async function collect(): Promise<Ref[]> {
  const [reviews, shots, disputes] = await Promise.all([
    db.select({ id: review.id, key: review.imageUrl }).from(review),
    db.select({ id: auditScreenshot.id, key: auditScreenshot.imageUrl }).from(auditScreenshot),
    db.select({ id: dispute.id, key: dispute.imageUrl }).from(dispute),
  ]);
  return [
    ...reviews.map((r) => ({ table: "review", ...r })),
    ...shots.map((r) => ({ table: "audit_screenshot", ...r })),
    ...disputes.map((r) => ({ table: "dispute", ...r })),
  ];
}

async function main(): Promise<void> {
  if (!storageEnabled()) {
    console.error("STORAGE_DIR is not set, so there is nothing to verify against.");
    process.exit(2);
  }

  const refs = await collect();
  const inline = refs.filter((r) => r.key.startsWith("data:"));
  const keyed = refs.filter((r) => !r.key.startsWith("data:") && r.key.trim() !== "");
  const empty = refs.filter((r) => !r.key.startsWith("data:") && r.key.trim() === "");

  const missing: Ref[] = [];
  for (const ref of keyed) {
    const full = resolveKey(ref.key);
    if (!full) {
      missing.push(ref);
      continue;
    }
    try {
      await access(full);
    } catch {
      missing.push(ref);
    }
  }

  console.log(`rows checked:   ${refs.length}`);
  console.log(`  on disk:      ${keyed.length - missing.length}`);
  console.log(`  inline data:  ${inline.length} (image lives in the row, nothing to copy)`);
  if (empty.length) console.log(`  empty:        ${empty.length}`);
  console.log(`  MISSING:      ${missing.length}`);

  if (missing.length) {
    console.log("\nMissing files:");
    for (const m of missing) console.log(`  ${m.table} ${m.id}  ->  ${m.key}`);
    process.exit(1);
  }
  console.log("\nEvery referenced screenshot is present.");
}

await main();
process.exit(0);

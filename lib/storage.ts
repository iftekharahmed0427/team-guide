import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

// Uploaded screenshots on local disk, under STORAGE_DIR. In the container that
// path is a bind mount from the host (/srv/teamguide/data/uploads), so images
// survive rebuilds and are backed up alongside the database.
//
// The stored value is a KEY like `reviews/<uuid>.png`, exactly the format the
// previous S3 implementation used, so rows written before the move keep
// resolving with no data migration beyond copying the objects onto the disk.
// Storage stays optional: when STORAGE_DIR is unset the callers fall back to
// inlining base64 data URLs in the database, and rows already holding a
// `data:` URL are rendered directly by the callers, never through here.

const root = process.env.STORAGE_DIR;

export function storageEnabled(): boolean {
  return Boolean(root);
}

// Absolute path for a key, or null if storage is off or the key tries to escape
// the storage root (`../`, absolute paths, symlink-ish tricks in the key text).
// Every filesystem call in this module and in /api/files goes through here.
export function resolveKey(key: string): string | null {
  if (!root) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, key);
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Decode a `data:<mime>;base64,...` URL and write it under `prefix/`.
// Returns the stored key (what to persist in the DB).
export async function uploadDataUrl(dataUrl: string, prefix: string): Promise<string> {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Expected a base64 data URL.");
  const contentType = m[1]!;
  const key = `${prefix}/${randomUUID()}.${EXT[contentType] ?? "bin"}`;
  const full = resolveKey(key);
  if (!full) throw new Error("Storage is not configured (set STORAGE_DIR).");
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(m[2]!, "base64"));
  return key;
}

// URL the browser loads a stored image from, or null if storage is off. The
// route behind it checks the session, so these are not public links and there is
// nothing to sign. Async to keep the call sites uniform with the DB reads
// around them.
export async function fileUrl(key: string): Promise<string | null> {
  if (!storageEnabled()) return null;
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
}

// Best-effort delete; never throws (cleanup shouldn't block a row delete).
export async function deleteFile(key: string): Promise<void> {
  if (key.startsWith("data:")) return; // legacy inline image, nothing on disk
  const full = resolveKey(key);
  if (!full) return;
  try {
    await rm(full, { force: true });
  } catch {
    // ignore - the DB row is already gone / will be
  }
}

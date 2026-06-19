import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Private Supabase storage bucket (S3-compatible). Uploads land here instead of
// inlining base64 in the database; reads use short-lived presigned URLs since the
// bucket is private. All config comes from STORAGE_* env vars (see .env.example),
// so storage is optional — when unset the callers fall back to inline data URLs.

const endpoint = process.env.STORAGE_ENDPOINT;
const region = process.env.STORAGE_REGION ?? "us-east-1";
const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
const bucket = process.env.STORAGE_BUCKET;

export function storageEnabled(): boolean {
  return Boolean(endpoint && accessKeyId && secretAccessKey && bucket);
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Storage is not configured (set the STORAGE_* env vars).");
  }
  if (!client) {
    client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true, // Supabase's S3 gateway requires path-style addressing
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Decode a `data:<mime>;base64,...` URL and upload it under `prefix/`.
// Returns the stored object key (what to persist in the DB).
export async function uploadDataUrl(dataUrl: string, prefix: string): Promise<string> {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Expected a base64 data URL.");
  const contentType = m[1]!;
  const body = Buffer.from(m[2]!, "base64");
  const key = `${prefix}/${randomUUID()}.${EXT[contentType] ?? "bin"}`;
  await s3().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
  return key;
}

// A short-lived presigned GET URL for a private object, or null if storage is off.
export async function signedGetUrl(key: string, expiresIn = 3600): Promise<string | null> {
  if (!storageEnabled()) return null;
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

// Best-effort delete; never throws (cleanup shouldn't block a row delete).
export async function deleteObject(key: string): Promise<void> {
  if (!storageEnabled()) return;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // ignore — the DB row is already gone / will be
  }
}

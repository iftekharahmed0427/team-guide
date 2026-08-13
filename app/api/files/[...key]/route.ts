import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { resolveKey } from "@/lib/storage";

export const dynamic = "force-dynamic";

const CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// Serves an uploaded screenshot from STORAGE_DIR. These replace the private
// bucket's presigned URLs, so the access check lives here: the proxy matcher
// skips paths containing a dot (every key ends in .png/.jpg), which means this
// route must authenticate itself rather than rely on the redirect.
//
// Keys are content-addressed by uuid and never rewritten, so a long private
// cache is safe.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ key: string[] }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { key } = await ctx.params;
  const full = resolveKey(key.map(decodeURIComponent).join("/"));
  if (!full) return new Response("Not found", { status: 404 });

  try {
    const info = await stat(full);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const body = await readFile(full);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": CONTENT_TYPE[path.extname(full).toLowerCase()] ?? "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

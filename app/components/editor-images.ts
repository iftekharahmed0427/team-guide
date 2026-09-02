import type { EditorView } from "@tiptap/pm/view";

// Images pasted, dropped, or uploaded into the news/guides editors are embedded
// directly as data URLs in the post's HTML (no external storage). To keep the
// content from ballooning, each image is downscaled to a max dimension and
// re-encoded as JPEG before it becomes a data URL.

const MAX_DIM = 1600;
const QUALITY = 0.9;

// Draw the image onto a canvas at most `maxDim` on its longest side.
async function downscale(file: Blob, maxDim: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas;
  } finally {
    bitmap.close?.();
  }
}

export async function imageToDataUrl(file: Blob, maxDim = MAX_DIM): Promise<string> {
  return (await downscale(file, maxDim)).toDataURL("image/jpeg", QUALITY);
}

// Same downscale, but kept as binary. Pass these straight to a server action:
// React sends a File as its own multipart part, while a data URL travels as a
// string in the action's argument payload, where React caps the total decoded
// string length at 1,000,000 characters. Audits send several screenshots at
// once, so they must go as Files (see app/(v1)/audits/actions.ts).
export async function imageToJpegFile(file: Blob, maxDim = MAX_DIM): Promise<File> {
  const canvas = await downscale(file, maxDim);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) throw new Error("could not encode the image");
  return new File([blob], "screenshot.jpg", { type: "image/jpeg" });
}

// Pull image files out of a paste/drop payload (clipboard exposes them via
// `files` or, for some screenshot tools, only via `items`).
export function imageFilesFrom(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files = Array.from(data.files).filter((f) => f.type.startsWith("image/"));
  if (files.length > 0) return files;
  const out: File[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}

function insertImages(view: EditorView, files: File[]): void {
  for (const file of files) {
    void imageToDataUrl(file)
      .then((src) => {
        const node = view.state.schema.nodes.image?.create({ src });
        if (!node) return;
        view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView());
      })
      .catch(() => {
        // skip a single image that fails to decode
      });
  }
}

// Spread into a TipTap `editorProps` to handle pasted and dropped images.
export const imageEditorProps = {
  handlePaste(view: EditorView, event: ClipboardEvent): boolean {
    const files = imageFilesFrom(event.clipboardData);
    if (files.length === 0) return false;
    event.preventDefault();
    insertImages(view, files);
    return true;
  },
  handleDrop(view: EditorView, event: DragEvent): boolean {
    const files = imageFilesFrom(event.dataTransfer);
    if (files.length === 0) return false;
    event.preventDefault();
    insertImages(view, files);
    return true;
  },
};

import type { EditorView } from "@tiptap/pm/view";

// Images pasted, dropped, or uploaded into the news/guides editors are embedded
// directly as data URLs in the post's HTML (no external storage). To keep the
// content from ballooning, each image is downscaled to a max dimension and
// re-encoded as JPEG before it becomes a data URL.

const MAX_DIM = 1600;
const QUALITY = 0.9;

export async function imageToDataUrl(file: Blob, maxDim = MAX_DIM): Promise<string> {
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
    return canvas.toDataURL("image/jpeg", QUALITY);
  } finally {
    bitmap.close?.();
  }
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

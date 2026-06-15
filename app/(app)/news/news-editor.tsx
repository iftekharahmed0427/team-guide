"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Undo2,
  Redo2,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { createPost } from "./actions";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center border border-border transition-colors disabled:opacity-40 ${
        active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function NewsEditor() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: "Write the announcement..." }),
    ],
    editorProps: {
      attributes: { class: "rich-text min-h-[320px] px-4 py-3" },
    },
  });

  function addTag(value: string) {
    const t = value.trim().replace(/,+$/, "").trim();
    if (!t || tags.includes(t) || tags.length >= 8) {
      setTagInput("");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  }

  function onTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  function toggleLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url, target: "_blank", rel: "noopener noreferrer" })
      .run();
  }

  async function handlePublish() {
    setError(null);
    if (!title.trim()) {
      setError("Add a title.");
      return;
    }
    if (!editor || editor.isEmpty) {
      setError("Write some content.");
      return;
    }
    setSubmitting(true);
    const res = await createPost({
      title,
      content: editor.getHTML(),
      excerpt: editor.getText().trim().slice(0, 200),
      tags,
    });
    if ("error" in res) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    router.push(`/news/${res.slug}`);
    router.refresh();
  }

  const ready = editor != null;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
        className="w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted"
      />

      <div className="flex flex-wrap items-center gap-2 border border-border bg-surface-2 px-2 py-2">
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1 border border-border bg-background px-2 py-0.5 text-xs text-foreground"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => setTags(tags.filter((x) => x !== t))}
              className="text-muted hover:text-foreground"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={onTagKeyDown}
          onBlur={() => addTag(tagInput)}
          placeholder={tags.length ? "Add tag" : "Add tags (press Enter)"}
          className="h-7 min-w-[140px] flex-1 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted"
        />
      </div>

      <div className="border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          <ToolbarButton label="Bold" disabled={!ready} active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold size={15} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Italic" disabled={!ready} active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic size={15} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" disabled={!ready} active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}>
            <Strikethrough size={15} strokeWidth={2} />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Heading 2" disabled={!ready} active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 size={15} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Heading 3" disabled={!ready} active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 size={15} strokeWidth={2} />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Bullet list" disabled={!ready} active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List size={15} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" disabled={!ready} active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={15} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Quote" disabled={!ready} active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
            <Quote size={15} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Inline code" disabled={!ready} active={editor?.isActive("code")} onClick={() => editor?.chain().focus().toggleCode().run()}>
            <Code size={15} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Link" disabled={!ready} active={editor?.isActive("link")} onClick={toggleLink}>
            <Link2 size={15} strokeWidth={2} />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Undo" disabled={!ready} onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 size={15} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Redo" disabled={!ready} onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 size={15} strokeWidth={2} />
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>

      {error ? (
        <p className="border border-red-500/40 px-3 py-2 text-sm text-red-400">{error}</p>
      ) : null}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handlePublish}
          disabled={submitting}
          className="btn-wipe btn-wipe-dark flex h-10 items-center gap-2 border border-border bg-foreground px-5 text-sm font-medium text-background disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 size={16} strokeWidth={2} className="animate-spin" />
          ) : (
            <Send size={16} strokeWidth={2} />
          )}
          Publish
        </button>
      </div>
    </div>
  );
}

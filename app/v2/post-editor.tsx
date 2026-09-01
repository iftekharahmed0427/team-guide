"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronLeft,
  Code,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Send,
  Strikethrough,
  TextQuote,
  Underline as UnderlineIcon,
  X,
} from "lucide-react";
import {
  imageEditorProps,
  imageToDataUrl,
} from "@/app/components/editor-images";
import V2ConfirmDialog from "./confirm-dialog";
import { PALETTE_COLOURS, pillFor, swatchFor } from "./post-shape";

// The v2 composer, built from the "new-post-page" Figma frame (node 91:4): the
// back / save / publish bar, the title card, the rich text card with its toolbar
// and footer, and the category + manage-categories rail. News and Guides both
// render it; only the copy and the category list differ.
//
// The editor is real TipTap on the same StarterKit the live editors use, so
// typing, formatting, images and the word count all work. Publish and Save draft
// are inert, like every other action on the v2 canvas - nothing here writes to
// the database yet.
//
// Serves both the new-post pages and the edit pages behind a post. There is no
// separate frame for editing - as with the audit form, only the heading and the
// publish label change, and the fields start filled.

/** An existing post being edited. */
export type InitialPost = {
  title: string;
  category: string | null;
  /** Stored HTML; TipTap parses it on mount. */
  html: string | null;
};

type Props = {
  heading: string;
  subheading: string;
  backHref: string;
  titleLabel: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  publishLabel: string;
  /** Category names the picker starts with. */
  categories: string[];
  categoryHint: string;
  initial?: InitialPost;
};

// Alignment needs @tiptap/extension-text-align, which the project does not have.
// The frame draws the three buttons, so they are rendered and disabled rather
// than dropped, which would change the shape of the toolbar.
const ALIGNMENT = [
  { icon: AlignLeft, label: "Align left" },
  { icon: AlignCenter, label: "Align centre" },
  { icon: AlignRight, label: "Align right" },
];

function Divider() {
  return <span className="mx-[8px] h-[16px] w-px shrink-0 bg-[#243033]" />;
}

export default function V2PostEditor({
  heading,
  subheading,
  backHref,
  titleLabel,
  titlePlaceholder,
  bodyPlaceholder,
  publishLabel,
  categories,
  categoryHint,
  initial,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<string | null>(
    initial?.category ?? null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  // The picker owns its own list so adding and removing are visible. Neither
  // writes to the database: news has no category table at all, and guides only
  // expose addGame, with no rename or delete action. Colours are presentational
  // for the same reason - game_category stores a name and a position, nothing
  // more - so a chosen colour lives here rather than being saved.
  const [list, setList] = useState(() =>
    initial?.category && !categories.includes(initial.category)
      ? [...categories, initial.category]
      : categories,
  );
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColour, setDraftColour] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);

  const pillClass = (name: string) =>
    chosen[name] !== undefined
      ? PALETTE_COLOURS[chosen[name]].pill
      : pillFor(name);
  const colourOf = (name: string) =>
    chosen[name] !== undefined
      ? PALETTE_COLOURS[chosen[name]].hex
      : swatchFor(name);

  function closeAdding() {
    setAdding(false);
    setDraftName("");
    setError(null);
  }

  function addCategory() {
    const name = draftName.trim();
    if (!name) {
      setError("Give it a name.");
      return;
    }
    if (list.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setError("That one already exists.");
      return;
    }
    setList([...list, name]);
    setChosen({ ...chosen, [name]: draftColour });
    setCategory(name);
    closeAdding();
  }

  function removeCategory(name: string) {
    setList(list.filter((c) => c !== name));
    if (category === name) setCategory(null);
  }

  // Escape closes the add popover, as does a click outside it.
  useEffect(() => {
    if (!adding) return;
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAdding();
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // The plus is a toggle, so let its own handler close the popover rather
      // than closing here and having the click reopen it.
      if (plusRef.current?.contains(target)) return;
      if (popoverRef.current && !popoverRef.current.contains(target))
        closeAdding();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [adding]);

  const editor = useEditor({
    immediatelyRender: false,
    content: initial?.html ?? "",
    extensions: [
      // H1 and H2, matching the frame's two heading buttons. The live editors
      // use H2/H3; nothing reads these levels back, so the frame wins here.
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Placeholder.configure({ placeholder: bodyPlaceholder }),
      Image.configure({ allowBase64: true }),
    ],
    editorProps: {
      attributes: { class: "v2-rich-text min-h-[594px] p-[24px] outline-none" },
      handlePaste: imageEditorProps.handlePaste,
      handleDrop: imageEditorProps.handleDrop,
    },
  });

  // useEditor alone does not re-render on every transaction in TipTap 3, so
  // reading editor.isActive() straight from JSX leaves the toolbar highlights
  // frozen at their first paint. This subscribes to what the toolbar shows.
  const marks = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const text = e.getText().trim();
      return {
        h1: e.isActive("heading", { level: 1 }),
        h2: e.isActive("heading", { level: 2 }),
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        blockquote: e.isActive("blockquote"),
        code: e.isActive("code"),
        link: e.isActive("link"),
        words: text ? text.split(/\s+/).length : 0,
      };
    },
  });

  const words = marks?.words ?? 0;

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    files.forEach(async (file) => {
      if (!file.type.startsWith("image/")) return;
      try {
        const src = await imageToDataUrl(file);
        editor?.chain().focus().setImage({ src }).run();
      } catch {
        // skip an image that fails to decode
      }
    });
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

  // Toolbar buttons keep the frame's 32px footprint: p-8 around a 16px glyph.
  function Btn({
    onClick,
    active,
    disabled,
    label,
    children,
  }: {
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        title={label}
        disabled={disabled}
        // Keep the selection while clicking, or formatting applies to nothing.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={`flex cursor-pointer items-center justify-center rounded-[6px] p-[8px] transition-colors disabled:cursor-default disabled:opacity-40 ${
          active
            ? "bg-[#8fb0a7]/[0.12] text-[#8fb0a7]"
            : "text-[#94a3b8] hover:bg-white/[0.04] hover:text-[#e2e8f0]"
        }`}
      >
        {children}
      </button>
    );
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPickImage}
      />

      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex min-w-0 items-center gap-[12px]">
          <Link
            href={backHref}
            aria-label="Back"
            className="flex shrink-0 items-center justify-center rounded-[8px] border border-[#243033]! p-[8px] text-[#8fb0a7] transition-colors hover:border-[#2f3d42]!"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </Link>
          <div className="flex min-w-0 flex-col gap-[4px]">
            <h1 className="truncate text-[28px] leading-[34px] font-bold text-[#e2e8f0]">
              {heading}
            </h1>
            <p className="truncate text-[14px] leading-[20px] font-normal text-[#94a3b8]">
              {subheading}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-[12px]">
          <button
            type="button"
            className="cursor-pointer rounded-[8px] border border-[#243033]! px-[16px] py-[10px] text-[14px] leading-[20px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
          >
            Save draft
          </button>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-[8px] rounded-[8px] bg-[#8fb0a7] px-[18px] py-[10px] text-[14px] leading-[20px] font-semibold text-[#0f141a] transition-colors hover:bg-[#a3c0b8]"
          >
            <Send size={14} strokeWidth={2} />
            {publishLabel}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-[24px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[20px]">
          <div className="flex flex-col gap-[12px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]">
            <label
              htmlFor="v2-post-title"
              className="text-[14px] leading-[20px] font-semibold text-[#94a3b8]"
            >
              {titleLabel}
            </label>
            <input
              id="v2-post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder}
              className="w-full rounded-[8px] border border-[#243033]! bg-[#0f141a] p-[14px] text-[16px] font-semibold text-[#e2e8f0] outline-none placeholder:font-normal placeholder:text-[#64748b] focus:border-[#8fb0a7]!"
            />
          </div>

          <div className="overflow-hidden rounded-[12px] border border-[#243033]! bg-[#171e24]">
            <div className="flex flex-wrap items-center border-b border-[#243033]! bg-[#0e1217] p-[12px]">
              <div className="flex items-center gap-[4px]">
                <Btn
                  label="Heading 1"
                  active={marks?.h1}
                  onClick={() =>
                    editor?.chain().focus().toggleHeading({ level: 1 }).run()
                  }
                >
                  <span className="text-[14px] leading-[16px] font-bold">
                    H1
                  </span>
                </Btn>
                <Btn
                  label="Heading 2"
                  active={marks?.h2}
                  onClick={() =>
                    editor?.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                >
                  <span className="text-[14px] leading-[16px] font-bold">
                    H2
                  </span>
                </Btn>
              </div>
              <Divider />
              <div className="flex items-center gap-[4px]">
                <Btn
                  label="Bold"
                  active={marks?.bold}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                  <Bold size={16} strokeWidth={2} />
                </Btn>
                <Btn
                  label="Italic"
                  active={marks?.italic}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                  <Italic size={16} strokeWidth={2} />
                </Btn>
                <Btn
                  label="Underline"
                  active={marks?.underline}
                  onClick={() =>
                    editor?.chain().focus().toggleUnderline().run()
                  }
                >
                  <UnderlineIcon size={16} strokeWidth={2} />
                </Btn>
                <Btn
                  label="Strikethrough"
                  active={marks?.strike}
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                >
                  <Strikethrough size={16} strokeWidth={2} />
                </Btn>
              </div>
              <Divider />
              <div className="flex items-center gap-[4px]">
                {ALIGNMENT.map(({ icon: Icon, label }) => (
                  <Btn key={label} label={`${label} (not enabled)`} disabled>
                    <Icon size={16} strokeWidth={2} />
                  </Btn>
                ))}
              </div>
              <Divider />
              <div className="flex items-center gap-[4px]">
                <Btn
                  label="Bullet list"
                  active={marks?.bulletList}
                  onClick={() =>
                    editor?.chain().focus().toggleBulletList().run()
                  }
                >
                  <List size={16} strokeWidth={2} />
                </Btn>
                <Btn
                  label="Numbered list"
                  active={marks?.orderedList}
                  onClick={() =>
                    editor?.chain().focus().toggleOrderedList().run()
                  }
                >
                  <ListOrdered size={16} strokeWidth={2} />
                </Btn>
              </div>
              <Divider />
              <div className="flex items-center gap-[4px]">
                <Btn
                  label="Quote"
                  active={marks?.blockquote}
                  onClick={() =>
                    editor?.chain().focus().toggleBlockquote().run()
                  }
                >
                  <TextQuote size={16} strokeWidth={2} />
                </Btn>
                <Btn
                  label="Code"
                  active={marks?.code}
                  onClick={() => editor?.chain().focus().toggleCode().run()}
                >
                  <Code size={16} strokeWidth={2} />
                </Btn>
                <Btn label="Link" active={marks?.link} onClick={toggleLink}>
                  <Link2 size={16} strokeWidth={2} />
                </Btn>
                <Btn
                  label="Insert image"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon size={16} strokeWidth={2} />
                </Btn>
              </div>
            </div>

            <EditorContent editor={editor} />

            <div className="flex items-center justify-between gap-[16px] border-t border-[#243033]! px-[24px] py-[12px] text-[12px] leading-[16px] font-medium text-[#64748b]">
              {/* The frame reads "Last saved 2 minutes ago"; nothing autosaves
                  yet, so this says what is actually true. */}
              <p>Not saved yet</p>
              <p>
                {words} word{words === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-[360px] shrink-0 flex-col gap-[20px]">
          <div className="flex flex-col gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]">
            <div className="flex flex-col gap-[4px]">
              <p className="text-[14px] leading-[20px] font-semibold text-[#e2e8f0]">
                Category
              </p>
              <p className="text-[12px] leading-[16px] font-medium text-[#94a3b8]">
                {categoryHint}
              </p>
            </div>
            <div className="h-px w-full bg-[#243033]" />

            {/* The frame gives each category a full-width row with a radio, and
                a second card for managing them. Both collapse into this one
                pill row: click to pick, the cross removes, the plus adds. It
                also stops the rail running to 29 rows on guides. */}
            <div className="relative flex flex-col gap-[12px]">
              <div className="flex flex-wrap items-center gap-[8px]">
                <div
                  role="radiogroup"
                  aria-label="Category"
                  className="contents"
                >
                  {list.map((name) => {
                    const picked = category === name;
                    return (
                      <span
                        key={name}
                        // The cross inherits this, so it matches its own pill.
                        style={{ color: colourOf(name) }}
                        className="relative inline-flex max-w-full"
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={picked}
                          onClick={() => setCategory(picked ? null : name)}
                          style={
                            picked ? { borderColor: colourOf(name) } : undefined
                          }
                          // Right padding is always reserved for the cross, so
                          // hovering never rewraps the row.
                          className={`max-w-full cursor-pointer truncate rounded-full border py-[4px] pr-[26px] pl-[10px] text-[11px] font-bold uppercase transition-opacity ${pillClass(name)} ${
                            picked
                              ? ""
                              : "border-transparent! opacity-70 hover:opacity-100"
                          }`}
                        >
                          {name}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${name}`}
                          title={`Remove ${name}`}
                          onClick={() => setPendingRemove(name)}
                          className="absolute top-1/2 right-[6px] -translate-y-1/2 cursor-pointer rounded-full p-[2px] text-current opacity-60 transition-opacity hover:opacity-100"
                        >
                          <X size={11} strokeWidth={3} />
                        </button>
                      </span>
                    );
                  })}
                </div>

                <button
                  ref={plusRef}
                  type="button"
                  aria-label="Add a category"
                  aria-expanded={adding}
                  title="Add a category"
                  onClick={() => setAdding((v) => !v)}
                  className="flex cursor-pointer items-center rounded-full border border-dashed border-[#34484e]! px-[10px] py-[4px] text-[#94a3b8] transition-colors hover:border-[#8fb0a7]! hover:text-[#8fb0a7]"
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>

              {adding ? (
                <div
                  ref={popoverRef}
                  className="flex flex-col gap-[12px] rounded-[12px] border border-[#243033]! bg-[#0e1217] p-[16px]"
                >
                  <div className="flex flex-col gap-[6px]">
                    <label
                      htmlFor="v2-new-category"
                      className="text-[12px] font-semibold text-[#94a3b8]"
                    >
                      Category name
                    </label>
                    <input
                      id="v2-new-category"
                      ref={nameRef}
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCategory();
                        } else if (e.key === "Escape") {
                          closeAdding();
                        }
                      }}
                      placeholder="Minecraft"
                      className="w-full rounded-[8px] border border-[#243033]! bg-[#171e24] px-[12px] py-[8px] text-[13px] font-medium text-[#e2e8f0] outline-none placeholder:font-normal placeholder:text-[#64748b] focus:border-[#8fb0a7]!"
                    />
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <p className="text-[12px] font-semibold text-[#94a3b8]">
                      Colour
                    </p>
                    <div className="flex items-center gap-[8px]">
                      {PALETTE_COLOURS.map((swatch, i) => (
                        <button
                          key={swatch.hex}
                          type="button"
                          aria-label={`Colour ${i + 1}`}
                          aria-pressed={draftColour === i}
                          onClick={() => setDraftColour(i)}
                          style={{ backgroundColor: swatch.hex }}
                          className={`size-[22px] cursor-pointer rounded-full transition-transform ${
                            draftColour === i
                              ? "scale-110 ring-2 ring-white/60 ring-offset-2 ring-offset-[#0e1217]"
                              : "opacity-70 hover:opacity-100"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {error ? (
                    <p className="text-[12px] text-[#ef4444]">{error}</p>
                  ) : null}

                  <div className="flex items-center gap-[8px]">
                    <button
                      type="button"
                      onClick={closeAdding}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-[8px] border border-[#243033]! px-[12px] py-[8px] text-[13px] font-semibold text-[#94a3b8] transition-colors hover:text-[#e2e8f0]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addCategory}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded-[8px] border border-transparent! bg-[#8fb0a7] px-[12px] py-[8px] text-[13px] font-semibold text-[#0f141a] transition-colors hover:bg-[#a3c0b8]"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {list.length === 0 ? (
              <p className="text-[13px] font-normal text-[#64748b]">
                No categories yet
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* The confirmation dialog from the "confirmation-popup" frame, reused. */}
      <V2ConfirmDialog
        open={pendingRemove !== null}
        description={`This action cannot be undone. ${pendingRemove} will be removed from the category list.`}
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) removeCategory(pendingRemove);
          setPendingRemove(null);
        }}
      />
    </div>
  );
}

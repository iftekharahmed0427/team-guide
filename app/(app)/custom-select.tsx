"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// The v2 select. The frames draw the closed trigger only - a dot, a label and a
// chevron - so the trigger is theirs and the open menu is built from the same
// tokens: the panel surface over the field surface, with the accent on the
// current choice.
//
// Controlled, so the caller keeps the value. Mirrors the keyboard handling of
// app/components/custom-select (the old-palette one it replaces here): Escape
// closes, the arrows move the active option, Enter or Space picks it, and focus
// returns to the trigger.

export type SelectOption = {
  value: string;
  label: string;
  /** Optional swatch shown before the label, as the review sources use. */
  dot?: string;
};

export default function CustomSelect({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  placeholder,
  triggerClass = "px-[14px] py-[11px] text-[14px] font-medium",
}: {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  /** Shown when the value matches no option, in the muted tone. */
  placeholder?: string;
  /**
   * Padding and typography for the closed trigger, replaced rather than
   * appended so two padding utilities never race. Defaults to the reviews
   * frame's; the audit form's fields are a step larger.
   */
  triggerClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Opening lands on the current choice rather than wherever the last one was.
  useEffect(() => {
    if (open)
      setActive(
        Math.max(
          0,
          options.findIndex((o) => o.value === value),
        ),
      );
  }, [open, options, value]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + delta + options.length) % options.length);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) choose(options[active]?.value ?? value);
      else setOpen(true);
    }
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`flex w-full cursor-pointer items-center justify-between gap-[8px] rounded-[8px] border bg-[#0e1217] text-left outline-none transition-colors ${triggerClass} ${
          selected ? "text-[#e2e8f0]" : "text-[#94a3b8]"
        } ${
          open
            ? "border-[#8fb0a7]!"
            : "border-[#243033]! hover:border-[#2f3d42]!"
        }`}
      >
        <span className="flex min-w-0 items-center gap-[8px]">
          {selected?.dot ? (
            <span
              style={{ backgroundColor: selected.dot }}
              className="size-[8px] shrink-0 rounded-full"
            />
          ) : null}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`shrink-0 text-[#94a3b8] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute top-full right-0 left-0 z-30 mt-[6px] max-h-[240px] overflow-y-auto rounded-[8px] border border-[#243033]! bg-[#171e24] p-[4px] shadow-[0px_16px_32px_-12px_rgba(0,0,0,0.6)]"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => choose(option.value)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-[8px] rounded-[6px] px-[10px] py-[8px] text-left text-[14px] transition-colors ${
                    i === active ? "bg-[#0e1217]" : ""
                  } ${isSelected ? "font-semibold text-[#e2e8f0]" : "font-medium text-[#94a3b8]"}`}
                >
                  <span className="flex min-w-0 items-center gap-[8px]">
                    {option.dot ? (
                      <span
                        style={{ backgroundColor: option.dot }}
                        className="size-[8px] shrink-0 rounded-full"
                      />
                    ) : null}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {isSelected ? (
                    <Check
                      size={14}
                      strokeWidth={2.5}
                      className="shrink-0 text-[#8fb0a7]"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

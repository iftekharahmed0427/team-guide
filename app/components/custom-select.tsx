"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

// Theme-matched replacement for a native <select>. Renders a hidden input so it
// still submits its value as part of a form / server action.
export default function CustomSelect({
  name,
  options,
  defaultValue,
  className = "",
  onChange,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  className?: string;
  onChange?: (value: string) => void;
}) {
  const initial = defaultValue ?? options[0]?.value ?? "";
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === initial)),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? options[0];

  // Close when clicking outside the control.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function choose(next: string) {
    setValue(next);
    setActive(Math.max(0, options.findIndex((o) => o.value === next)));
    setOpen(false);
    buttonRef.current?.focus();
    onChange?.(next);
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="flex h-9 w-full items-center justify-between gap-2 border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors hover:border-muted focus:border-muted"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          size={15}
          strokeWidth={1.75}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="fx-menu absolute left-0 right-0 z-20 mt-1 border border-border bg-surface py-1 shadow-lg shadow-black/40"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === active;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => choose(opt.value)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                    isActive ? "bg-surface-2 text-foreground" : "text-muted"
                  }`}
                >
                  {opt.label}
                  {isSelected ? <Check size={14} strokeWidth={2} className="shrink-0" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

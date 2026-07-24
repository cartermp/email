"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Props {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  triggerClassName: string;
  contentClassName: string;
  align?: "left" | "right";
  role?: "dialog" | "menu";
}

export default function Popover({
  label,
  trigger,
  children,
  triggerClassName,
  contentClassName,
  align = "right",
  role = "menu",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function focusFirstItem() {
    requestAnimationFrame(() => {
      contentRef.current
        ?.querySelector<HTMLElement>(
          '[role="menuitem"], a[href], button:not([disabled])',
        )
        ?.focus();
    });
  }

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup={role}
        aria-controls={open ? contentId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          setOpen(true);
          focusFirstItem();
        }}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={contentRef}
          id={contentId}
          role={role}
          aria-label={label}
          className={[
            "absolute top-full z-30 mt-1",
            align === "left" ? "left-0" : "right-0",
            contentClassName,
          ].join(" ")}
          onClick={(event) => {
            if ((event.target as Element).closest("a, button")) setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </span>
  );
}

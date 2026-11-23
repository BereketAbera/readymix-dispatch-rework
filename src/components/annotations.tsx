"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHANGES } from "@/content/changes";
import { cn } from "@/lib/utils";

const AnnotationsContext = createContext(false);

export function AnnotationsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <AnnotationsContext.Provider value={enabled}>{children}</AnnotationsContext.Provider>;
}

export function useAnnotations(): boolean {
  return useContext(AnnotationsContext);
}

/**
 * A numbered marker that matches an item in "What changed and why". Place it
 * inside a relative parent. It opens on click or tap (a hover tooltip would do
 * nothing on a phone).
 */
export function Marker({ n, className }: { n: number; className?: string }) {
  const enabled = useContext(AnnotationsContext);
  if (!enabled) return null;
  const change = CHANGES[n - 1];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-annotation={n}
          aria-label={`Change ${n}: ${change.title}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute z-30 flex size-6 items-center justify-center rounded-full bg-fuchsia-700 text-xs font-bold text-white shadow-md ring-2 ring-white",
            "focus-visible:ring-4 focus-visible:ring-fuchsia-300 focus-visible:outline-none",
            className,
          )}
        >
          {n}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        className="w-80 text-[13px] leading-snug"
        // The content is portalled, but React events still bubble to the row that holds the marker.
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-semibold">
          {n}. {change.title}
        </p>
        <p className="mt-1 text-muted-foreground">{change.text}</p>
      </PopoverContent>
    </Popover>
  );
}

function LegendList({ className, id, hidden }: { className?: string; id?: string; hidden?: boolean }) {
  return (
    <div id={id} hidden={hidden} className={className}>
      <ol className="grid gap-3 md:max-xl:grid-cols-2">
        {CHANGES.map((c) => (
          <li key={c.n} className="flex gap-2.5 text-[12.5px] leading-snug">
            <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-fuchsia-700 text-[11px] font-bold text-white">
              {c.n}
            </span>
            <span>
              <strong className="font-semibold">{c.title}.</strong> {c.short}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Tap a numbered marker for the full reasoning, or{" "}
        <Link href="/#changes-heading" className="font-medium text-primary underline underline-offset-2">
          read it all on the overview
        </Link>
        .
      </p>
    </div>
  );
}

/** The legend as a column beside the board, from 1280 px, so it never covers a row. */
export function AnnotationColumn({ onClose }: { onClose: () => void }) {
  const enabled = useContext(AnnotationsContext);
  if (!enabled) return null;
  return (
    <aside
      aria-label="What changed and why"
      className="hidden min-h-0 w-[288px] shrink-0 flex-col border-l bg-card xl:flex"
      data-testid="annotation-column"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b pr-2 pl-4">
        <h2 className="text-sm font-semibold">What changed and why</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Hide annotations">
          <X aria-hidden />
        </Button>
      </div>
      <LegendList className="min-h-0 flex-1 overflow-y-auto px-4 py-3" />
    </aside>
  );
}

/**
 * Below 1280 px the legend is a bar pinned to the bottom, collapsed to one line
 * so it does not hide the cards it explains. The board reserves its height.
 */
export function AnnotationBar({ onClose }: { onClose: () => void }) {
  const enabled = useContext(AnnotationsContext);
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (!enabled) return null;
  return (
    <aside
      aria-label="What changed and why"
      className="fixed inset-x-3 bottom-3 z-40 flex max-h-[60dvh] flex-col rounded-xl border bg-card shadow-2xl md:inset-x-6 lg:left-20 xl:hidden"
    >
      <div className="flex min-h-12 shrink-0 items-center gap-2 pr-2 pl-4">
        <h2 className="truncate text-sm font-semibold">What changed and why</h2>
        <span className="hidden text-sm text-muted-foreground sm:inline">· {CHANGES.length} changes</span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto max-md:h-11"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide" : "Show"}
          <ChevronUp className={cn("transition-transform", !open && "rotate-180")} aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-sm" className="max-md:size-11" onClick={onClose} aria-label="Hide annotations">
          <X aria-hidden />
        </Button>
      </div>
      <LegendList id={listId} hidden={!open} className="min-h-0 overflow-y-auto border-t px-4 py-3" />
    </aside>
  );
}

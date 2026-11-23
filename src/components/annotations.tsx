"use client";

import { createContext, useContext, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHANGES } from "@/content/changes";
import { cn } from "@/lib/utils";

const AnnotationsContext = createContext(false);

export function AnnotationsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <AnnotationsContext.Provider value={enabled}>{children}</AnnotationsContext.Provider>;
}

/** A numbered marker that matches an item in "What changed and why". Place inside a relative parent. */
export function Marker({ n, className }: { n: number; className?: string }) {
  const enabled = useContext(AnnotationsContext);
  if (!enabled) return null;
  const change = CHANGES[n - 1];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
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
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72 text-left leading-snug">
        <span>
          <strong className="block">{change.title}</strong>
          {change.text}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

export function AnnotationLegend({ onClose }: { onClose: () => void }) {
  const enabled = useContext(AnnotationsContext);
  if (!enabled) return null;
  return (
    <aside
      aria-label="What changed and why"
      className="fixed inset-x-3 bottom-3 z-40 max-h-[45dvh] overflow-y-auto rounded-xl border bg-card shadow-2xl md:inset-x-6 md:bottom-4 md:max-h-[40dvh] lg:left-[264px]"
    >
      <div className="sticky top-0 flex items-center justify-between border-b bg-card px-4 py-2.5">
        <h2 className="text-sm font-semibold">What changed and why</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Hide annotations">
          <X aria-hidden />
        </Button>
      </div>
      <ol className="grid gap-x-6 gap-y-3 px-4 py-3 md:grid-cols-2 xl:grid-cols-4">
        {CHANGES.map((c) => (
          <li key={c.n} className="flex gap-2.5 text-[12.5px] leading-snug">
            <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-fuchsia-700 text-[11px] font-bold text-white">
              {c.n}
            </span>
            <span>
              <strong className="font-semibold">{c.title}.</strong> {c.text}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

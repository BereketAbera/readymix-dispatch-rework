import type { ReactNode } from "react";
import {
  ClipboardList,
  FlaskConical,
  LayoutGrid,
  Lock,
  Receipt,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { MixerTruck } from "@/components/glyphs";
import { cn } from "@/lib/utils";

const PLACEHOLDERS: { label: string; icon: LucideIcon }[] = [
  { label: "Batches and tickets", icon: ClipboardList },
  { label: "Quality and lab", icon: FlaskConical },
  { label: "Invoicing", icon: Receipt },
  { label: "Fleet", icon: Truck },
];

/** The fictional company's mark: a mixer truck on a yellow tile, drawn like src/app/icon.svg. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[7px] bg-brand text-brand-foreground",
        className,
      )}
    >
      <MixerTruck className="size-[27px]" strokeWidth={2.3} />
    </span>
  );
}

export function ProductBrand({ subtitle = "Operations" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold">Prairie Ready-Mix</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle} · fictional</p>
      </div>
    </div>
  );
}

/**
 * Left navigation of the operations portal. Only Dispatch is part of this
 * sample. From 1024 px it is an icon rail, from 1280 px the full sidebar,
 * unless `compact` keeps the rail (annotations need the width).
 */
export function ProductSidebar({ compact = false }: { compact?: boolean }) {
  const label = compact ? "sr-only" : "sr-only xl:not-sr-only";
  const full = compact ? "hidden" : "hidden xl:flex";
  return (
    <aside
      className={cn("hidden w-14 shrink-0 flex-col border-r bg-sidebar lg:flex", !compact && "xl:w-60")}
      aria-label="Portal"
    >
      <div className="flex h-14 items-center border-b px-3">
        <span className={cn(compact ? "flex" : "flex xl:hidden")}>
          <BrandMark />
          <span className="sr-only">Prairie Ready-Mix, operations (fictional)</span>
        </span>
        <span className={cn(full, "px-1")}>
          <ProductBrand />
        </span>
      </div>
      <nav aria-label="Portal sections" className="flex-1 p-2">
        <ul className="grid gap-0.5">
          <li>
            <a
              href="#board"
              aria-current="page"
              title="Dispatch"
              className="flex h-9 items-center gap-2.5 rounded-md bg-sidebar-accent px-2.5 text-sm font-medium text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <LayoutGrid className="size-4 shrink-0" aria-hidden />
              <span className={label}>Dispatch</span>
            </a>
          </li>
        </ul>
        <p className={cn(full, "mt-5 mb-1 items-center gap-1.5 px-2.5 text-xs font-medium text-muted-foreground")}>
          <Lock className="size-3" aria-hidden />
          Not in this sample
        </p>
        <ul className={cn("grid gap-0.5", compact ? "mt-3" : "mt-3 xl:mt-0")}>
          {PLACEHOLDERS.map(({ label: text, icon: Icon }) => (
            <li key={text}>
              <span
                className="flex h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground"
                title={`${text}: not part of this sample`}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className={label}>{text}</span>
                <span className="sr-only"> (not part of this sample)</span>
              </span>
            </li>
          ))}
        </ul>
      </nav>
      <div className={cn(full, "border-t p-4 text-xs text-muted-foreground")}>Dispatcher · sample account</div>
    </aside>
  );
}

export function ProductShell({
  children,
  aside,
  compactNav = false,
}: {
  children: ReactNode;
  /** A column on the right, such as the annotation legend. */
  aside?: ReactNode;
  compactNav?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <ProductSidebar compact={compactNav} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {aside}
    </div>
  );
}

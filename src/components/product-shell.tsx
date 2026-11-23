import type { ReactNode } from "react";
import {
  ClipboardList,
  FlaskConical,
  LayoutGrid,
  Receipt,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { label: string; icon: LucideIcon; active?: boolean }[] = [
  { label: "Dispatch", icon: LayoutGrid, active: true },
  { label: "Batches and tickets", icon: ClipboardList },
  { label: "Quality and lab", icon: FlaskConical },
  { label: "Invoicing", icon: Receipt },
  { label: "Fleet", icon: Truck },
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-400 font-mono text-[13px] font-bold text-zinc-900",
        className,
      )}
    >
      PR
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

/** Left navigation of the operations portal. Only Dispatch is part of this sample. */
export function ProductSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar lg:flex" aria-label="Portal">
      <div className="flex h-14 items-center border-b px-4">
        <ProductBrand />
      </div>
      <nav aria-label="Portal sections" className="flex-1 p-2">
        <ul className="grid gap-0.5">
          {NAV.map(({ label, icon: Icon, active }) => (
            <li key={label}>
              {active ? (
                <a
                  href="#board"
                  aria-current="page"
                  className="flex h-9 items-center gap-2.5 rounded-md bg-sidebar-accent px-2.5 text-sm font-medium text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </a>
              ) : (
                <span
                  className="flex h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground"
                  title="Not part of this sample"
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                  <span className="sr-only"> (not part of this sample)</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">Signed in as dispatcher · sample account</div>
    </aside>
  );
}

export function ProductShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <ProductSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

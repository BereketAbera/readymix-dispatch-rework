import {
  Ban,
  CircleCheck,
  ClockAlert,
  CircleExclamationPoint,
  CirclePause,
  Clock,
  Droplets,
  Factory,
  MapPin,
  TriangleExclamationPoint,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus, Risk } from "@/lib/dispatch";

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  className: string;
  /** What the first version showed instead of a word. */
  legacyCode: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  scheduled: { label: "Scheduled", icon: Clock, className: "bg-slate-100 text-slate-700 ring-slate-300", legacyCode: "SCHD" },
  batching: { label: "Batching", icon: Factory, className: "bg-indigo-50 text-indigo-800 ring-indigo-200", legacyCode: "BTCH" },
  en_route: { label: "En route", icon: Truck, className: "bg-sky-50 text-sky-800 ring-sky-200", legacyCode: "ENRT" },
  on_site: { label: "On site", icon: MapPin, className: "bg-violet-50 text-violet-800 ring-violet-200", legacyCode: "ONST" },
  pouring: { label: "Pouring", icon: Droplets, className: "bg-teal-50 text-teal-800 ring-teal-200", legacyCode: "POUR" },
  complete: { label: "Complete", icon: CircleCheck, className: "bg-emerald-50 text-emerald-800 ring-emerald-200", legacyCode: "CMPL" },
  on_hold: { label: "On hold", icon: CirclePause, className: "bg-stone-100 text-stone-700 ring-stone-300", legacyCode: "HOLD" },
  cancelled: { label: "Cancelled", icon: Ban, className: "bg-zinc-100 text-zinc-600 ring-zinc-300", legacyCode: "CNCL" },
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        meta.className,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

export function RiskBadge({ risk, className }: { risk: Risk; className?: string }) {
  const late = risk.level === "late";
  const Icon = late ? TriangleExclamationPoint : CircleExclamationPoint;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        late ? "bg-red-50 text-red-800 ring-red-200" : "bg-amber-50 text-amber-900 ring-amber-300",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {late ? "Late" : "At risk"}
    </span>
  );
}

/** One line under the status: what is wrong, in a few words. */
export function RiskNote({ risk, className }: { risk: Risk; className?: string }) {
  const late = risk.level === "late";
  const Icon = late ? TriangleExclamationPoint : CircleExclamationPoint;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        late ? "text-red-700" : "text-amber-800",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span>
        <span className="sr-only">{late ? "Late: " : "At risk: "}</span>
        {risk.short}
      </span>
    </span>
  );
}

/** Partial data: flags a row whose position or ETA comes from a stale feed. */
export function StaleNote({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-amber-800", className)}>
      <ClockAlert className="size-3.5 shrink-0" aria-hidden />
      {text}
    </span>
  );
}

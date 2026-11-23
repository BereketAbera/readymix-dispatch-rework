import type { ReactNode } from "react";
import { CloudAlert, RefreshCw, SearchX, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* One set of state components, used by every screen and shown on /standard. */

type HeadingLevel = "h1" | "h2" | "h3";

export function TableSkeleton({ rows = 8, columns = 7, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("w-full overflow-hidden", className)} role="status" aria-live="polite">
      <span className="sr-only">Loading orders</span>
      <div className="flex h-10 items-center gap-4 border-b px-3" aria-hidden>
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className={cn("h-3 shrink-0", i === 1 ? "w-40" : "w-14")} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-14 items-center gap-4 border-b px-3" aria-hidden>
          <Skeleton className="h-4 w-11 shrink-0" />
          <div className="grid w-56 shrink-0 gap-1.5">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="ml-auto h-3.5 w-10 shrink-0" />
          <Skeleton className="h-3.5 w-16 shrink-0" />
          <Skeleton className="h-6 w-20 shrink-0 rounded-md" />
          <Skeleton className="hidden h-6 w-24 shrink-0 rounded-md lg:block" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-2" role="status" aria-live="polite">
      <span className="sr-only">Loading orders</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid gap-2 rounded-lg border bg-card p-3" aria-hidden>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-11" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-3 w-64 max-w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-2 rounded-lg border bg-card p-3", className)} aria-hidden>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function EmptyState({
  icon: Icon = SearchX,
  title,
  children,
  action,
  className,
  headingLevel: Heading = "h2",
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  headingLevel?: HeadingLevel;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <Heading className="mt-3 text-base font-semibold">{title}</Heading>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Nothing has loaded yet and the request failed: say so, say what still works, offer Retry. */
export function ErrorState({
  title,
  children,
  onRetry,
  retrying = false,
  className,
  headingLevel: Heading = "h2",
}: {
  title: string;
  children?: ReactNode;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
  headingLevel?: HeadingLevel;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-700">
        <CloudAlert className="size-5" aria-hidden />
      </span>
      <Heading className="mt-3 text-base font-semibold">{title}</Heading>
      {children && <p className="mt-1 max-w-md text-sm text-muted-foreground">{children}</p>}
      <Button className="mt-4 max-md:h-11" variant="outline" onClick={onRetry} disabled={retrying} aria-busy={retrying}>
        <RefreshCw className={cn(retrying && "animate-spin")} aria-hidden />
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}

/** A refresh failed but earlier data is on screen: keep it, say how old it is, offer Retry. */
export function RefreshFailedBanner({
  title,
  children,
  onRetry,
  retrying = false,
}: {
  title: string;
  children?: ReactNode;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950"
    >
      <CloudAlert className="size-4 shrink-0 text-red-700" aria-hidden />
      <span className="min-w-0 flex-1">
        <strong className="font-semibold">{title}</strong> {children}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="bg-white max-md:h-11"
        onClick={onRetry}
        disabled={retrying}
        aria-busy={retrying}
      >
        <RefreshCw className={cn(retrying && "animate-spin")} aria-hidden />
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}

export function PartialNotice({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}

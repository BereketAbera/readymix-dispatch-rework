import { DemoBar } from "@/components/demo-bar";
import { ProductShell } from "@/components/product-shell";
import { CardsSkeleton, TableSkeleton, TileSkeleton } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";

/** The board's shape while it loads: same shell, same header, skeleton tiles and rows (rule ST1). */
export function BoardSkeleton() {
  return (
    <div className="flex flex-col md:h-dvh">
      <DemoBar />
      <ProductShell>
        <main className="flex min-h-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b bg-card px-4 py-3 md:px-6">
            <div className="mr-auto min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">Dispatch</h1>
              <p className="text-sm text-muted-foreground">Loading today’s board…</p>
            </div>
            <Skeleton className="h-9 w-full sm:w-80" />
          </header>
          <div className="grid grid-cols-2 gap-2 px-4 pt-4 md:px-6 lg:grid-cols-5" aria-hidden>
            <TileSkeleton className="col-span-2" />
            <TileSkeleton />
            <TileSkeleton />
            <TileSkeleton className="col-span-2 lg:col-span-1" />
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3 md:px-6" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <div className="min-h-0 flex-1 px-4 pb-4 md:px-6">
            <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
              <TableSkeleton rows={10} />
            </div>
            <div className="md:hidden">
              <CardsSkeleton />
            </div>
          </div>
        </main>
      </ProductShell>
    </div>
  );
}

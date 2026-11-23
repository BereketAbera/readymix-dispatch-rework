"use client";

import { Fragment, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, NotebookText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadProgress, TruckChips, formatM3 } from "@/components/dispatch/bits";
import { RiskNote, StatusBadge } from "@/components/dispatch/status";
import { Marker } from "@/components/annotations";
import { formatClock, getRisk, type Order } from "@/lib/dispatch";
import { isDone } from "@/components/dispatch/bits";
import { cn } from "@/lib/utils";

interface ColumnMeta {
  /** Applied to both header and cells: width, alignment, responsive priority. */
  className?: string;
}

/**
 * Column priority: Start, Customer and site, Volume, Loads and Status always show.
 * Trucks appear from 1024 px, Mix and pour from 1280 px. Below 768 px the board uses cards.
 */
function buildColumns(
  clock: number,
  onOpen: (id: string) => void,
  annotateRow: string | null,
): ColumnDef<Order>[] {
  return [
    {
      id: "start",
      accessorFn: (o) => o.scheduledStart,
      header: "Start",
      enableSorting: true,
      meta: { className: "w-[88px] pl-4" } satisfies ColumnMeta,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium tabular">{formatClock(row.original.scheduledStart)}</span>
      ),
    },
    {
      id: "customer",
      header: "Customer and site",
      enableSorting: false,
      meta: { className: "min-w-[220px] max-w-[340px]" } satisfies ColumnMeta,
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div className="min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(o.id);
              }}
              className={cn(
                "max-w-full truncate rounded-sm text-left font-medium hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                o.status === "cancelled" && "text-muted-foreground line-through",
              )}
            >
              {o.customer}
              <span className="sr-only">, open order {o.number}</span>
            </button>
            {annotateRow === o.id && <Marker n={6} className="relative top-0.5 ml-2 inline-flex size-5 text-[11px]" />}
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              {o.notes && (
                <>
                  <NotebookText className="size-3.5 shrink-0" aria-hidden />
                  <span className="sr-only">Has notes. </span>
                </>
              )}
              <span className="truncate">{o.siteAddress}</span>
            </p>
          </div>
        );
      },
    },
    {
      id: "mix",
      header: "Mix and pour",
      enableSorting: false,
      meta: { className: "hidden xl:table-cell" } satisfies ColumnMeta,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.original.mix.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.pourType} · {row.original.placement}
          </p>
        </div>
      ),
    },
    {
      id: "volume",
      accessorFn: (o) => o.volumeM3,
      header: () => (
        <>
          Volume <span className="font-normal text-muted-foreground">m³</span>
        </>
      ),
      enableSorting: false,
      meta: { className: "w-[96px] text-right" } satisfies ColumnMeta,
      cell: ({ row }) => <span className="font-mono text-sm tabular">{formatM3(row.original.volumeM3)}</span>,
    },
    {
      id: "loads",
      header: "Loads",
      enableSorting: false,
      meta: { className: "w-[120px] text-right" } satisfies ColumnMeta,
      cell: ({ row }) => (
        <LoadProgress
          className="justify-end"
          delivered={row.original.loadsDelivered}
          total={row.original.loadsTotal}
        />
      ),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      meta: { className: "w-[200px]" } satisfies ColumnMeta,
      cell: ({ row }) => {
        const risk = getRisk(row.original, clock);
        return (
          <div className="grid justify-items-start gap-0.5">
            <StatusBadge status={row.original.status} />
            {risk && <RiskNote risk={risk} />}
          </div>
        );
      },
    },
    {
      id: "trucks",
      header: "Trucks",
      enableSorting: false,
      meta: { className: "hidden w-[236px] pr-4 lg:table-cell" } satisfies ColumnMeta,
      cell: ({ row }) => <TruckChips order={row.original} />,
    },
  ];
}

export function OrdersTable({
  orders,
  clock,
  selectedId,
  onOpen,
  annotate = false,
  className,
}: {
  orders: Order[];
  clock: number;
  selectedId?: string | null;
  onOpen: (id: string) => void;
  /** Show annotation markers on the header and first row. */
  annotate?: boolean;
  className?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "start", desc: false }]);
  const firstOpen = orders.filter((o) => !isDone(o)).sort((a, b) => a.scheduledStart - b.scheduledStart)[0];
  const annotateRow = annotate ? (firstOpen?.id ?? null) : null;
  const columns = useMemo(() => buildColumns(clock, onOpen, annotateRow), [clock, onOpen, annotateRow]);
  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (o) => o.id,
  });

  // Finished work sinks to the bottom; the board leads with what still needs attention.
  const sortedRows = table.getRowModel().rows;
  const openRows = sortedRows.filter((r) => !isDone(r.original));
  const doneRows = sortedRows.filter((r) => isDone(r.original));

  return (
    <Table containerClassName={cn("overflow-auto", className)} className="border-separate border-spacing-0">
      <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b-0">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="hover:bg-transparent">
            {group.headers.map((header) => {
              const meta = header.column.columnDef.meta as ColumnMeta | undefined;
              const sorted = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "relative h-10 border-b bg-card text-xs font-semibold text-muted-foreground",
                    meta?.className,
                  )}
                >
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === "desc" ? (
                        <ArrowDown className="size-3.5" aria-hidden />
                      ) : (
                        <ArrowUp className="size-3.5" aria-hidden />
                      )}
                      <span className="sr-only">, sort {sorted === "asc" ? "latest first" : "earliest first"}</span>
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                  {annotate && header.column.id === "customer" && (
                    <Marker n={4} className="relative top-0.5 ml-2 inline-flex size-5 text-[11px]" />
                  )}
                  {annotate && header.column.id === "status" && (
                    <Marker n={5} className="relative top-0.5 ml-2 inline-flex size-5 text-[11px]" />
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {[openRows, doneRows].map((rows, group) => (
          <Fragment key={group}>
            {group === 1 && rows.length > 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-9 border-b bg-muted/60 py-1 pl-4 text-xs font-semibold text-muted-foreground"
                >
                  Completed and cancelled · {rows.length}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow
                key={row.id}
                data-testid="order-row"
                data-state={row.original.id === selectedId ? "selected" : undefined}
                onClick={() => onOpen(row.original.id)}
                className={cn("h-[52px] cursor-pointer", row.original.status === "cancelled" && "text-muted-foreground")}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
                  return (
                    <TableCell key={cell.id} className={cn("border-b py-1.5", meta?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

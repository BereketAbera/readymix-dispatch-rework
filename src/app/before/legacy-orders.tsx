"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronsUpDown, Funnel } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_META } from "@/components/dispatch/status";
import { formatClock, type DispatchDay, type Order, type PourType } from "@/lib/dispatch";

/*
 * A reconstruction of a typical first version: every field gets a column,
 * codes come straight from the database, filters wait for an Apply button
 * and every row carries four buttons.
 */

const POUR_CODES: Record<PourType, string> = {
  Footing: "FTG",
  Wall: "WALL",
  "Basement floor": "BSMT_FLR",
  "Slab on grade": "SOG",
  "Suspended slab": "SUSP_SLAB",
  "Grade beam": "GRD_BM",
  Pile: "PILE",
  Sidewalk: "SDWK",
  Driveway: "DRVWY",
  "Curb and gutter": "CURB_GTR",
};

const selectClass =
  "h-8 w-full rounded-md border border-input bg-white px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

interface Filters {
  plant: string;
  status: string;
  customer: string;
  pour: string;
  mix: string;
  truck: string;
  from: string;
  to: string;
}

const EMPTY: Filters = { plant: "", status: "", customer: "", pour: "", mix: "", truck: "", from: "", to: "" };

function applyFilters(orders: Order[], f: Filters, plantCode: (id: string) => string): Order[] {
  return orders.filter((o) => {
    if (f.plant && plantCode(o.plantId) !== f.plant) return false;
    if (f.status && STATUS_META[o.status].legacyCode !== f.status) return false;
    if (f.customer && o.customer !== f.customer) return false;
    if (f.pour && POUR_CODES[o.pourType] !== f.pour) return false;
    if (f.mix && o.mix.code !== f.mix) return false;
    if (f.truck && !o.truckIds.includes(f.truck)) return false;
    if (f.from && formatClock(o.scheduledStart) < f.from) return false;
    if (f.to && formatClock(o.scheduledStart) > f.to) return false;
    return true;
  });
}

export function LegacyOrders({ day }: { day: DispatchDay }) {
  const plantCode = (id: string) => day.plants.find((p) => p.id === id)?.code ?? id;
  const [showFilters, setShowFilters] = useState(true);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [sorting, setSorting] = useState<SortingState>([]);

  const data = useMemo(() => applyFilters(day.orders, applied, plantCode), [day.orders, applied]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      { id: "id", header: "Order ID", accessorFn: (o) => o.number },
      { id: "customer", header: "Customer", accessorFn: (o) => o.customer },
      { id: "site", header: "Site Address", accessorFn: (o) => o.siteAddress },
      { id: "plant", header: "Plant", accessorFn: (o) => plantCode(o.plantId) },
      { id: "mix", header: "Mix Code", accessorFn: (o) => o.mix.code },
      { id: "pour", header: "Pour Type", accessorFn: (o) => POUR_CODES[o.pourType] },
      { id: "volume", header: "Volume", accessorFn: (o) => o.volumeM3 },
      { id: "del", header: "Loads Del", accessorFn: (o) => o.loadsDelivered },
      { id: "total", header: "Loads Total", accessorFn: (o) => o.loadsTotal },
      { id: "start", header: "Start Time", accessorFn: (o) => `${day.date} ${formatClock(o.scheduledStart)}:00` },
      { id: "status", header: "Status", accessorFn: (o) => STATUS_META[o.status].legacyCode },
      { id: "trucks", header: "Trucks", accessorFn: (o) => o.truckIds.join(",") || "null" },
      { id: "notes", header: "Notes", accessorFn: (o) => o.notes || "null" },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: () => (
          <div className="flex flex-wrap gap-1">
            <Button size="xs" variant="outline" className="border-blue-300 text-blue-700">
              Edit
            </Button>
            <Button size="xs" variant="outline">
              View
            </Button>
            <Button size="xs" variant="outline" className="border-emerald-300 text-emerald-700">
              Assign
            </Button>
            <Button size="xs" variant="outline" className="border-red-300 text-red-700">
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [day.date], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const unique = (values: string[]) => Array.from(new Set(values)).sort();
  const options = {
    plant: day.plants.map((p) => p.code),
    status: Object.values(STATUS_META).map((m) => m.legacyCode),
    customer: unique(day.orders.map((o) => o.customer)),
    pour: Object.values(POUR_CODES),
    mix: unique(day.orders.map((o) => o.mix.code)),
    truck: day.trucks.map((t) => t.unit),
  };
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = data.length;
  const from = total ? pageIndex * pageSize + 1 : 0;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className="px-4 py-4 md:px-6">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        Home / Dispatch / Orders
      </nav>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">Orders</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
            <Funnel aria-hidden />
            Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
                <ChevronDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem>Export CSV</DropdownMenuItem>
              <DropdownMenuItem>Import orders</DropdownMenuItem>
              <DropdownMenuItem>Print</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Bulk assign</DropdownMenuItem>
              <DropdownMenuItem>New order</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Column settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showFilters && (
        <form
          className="mt-3 rounded-lg border bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(draft);
            table.setPageIndex(0);
          }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {(
              [
                ["plant", "Plant"],
                ["status", "Status"],
                ["customer", "Customer"],
                ["pour", "Pour Type"],
                ["mix", "Mix Code"],
                ["truck", "Truck"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="grid gap-1 text-xs font-medium text-muted-foreground">
                {label}
                <select
                  className={selectClass}
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                >
                  <option value="">-- All --</option>
                  {options[key].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Start From
              <input
                type="time"
                className={selectClass}
                value={draft.from}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Start To
              <input
                type="time"
                className={selectClass}
                value={draft.to}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm">
              Apply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(EMPTY);
                setApplied(EMPTY);
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      )}

      <div className="mt-3 rounded-lg border bg-card">
        <Table className="min-w-[1180px]">
          <TableHeader className="bg-muted/70">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} className="px-2 text-[11px] font-semibold uppercase">
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ChevronsUpDown className="size-3 text-muted-foreground" aria-hidden />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-testid="legacy-row">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-2 align-top text-[13px] break-words whitespace-normal">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-sm text-muted-foreground">
          <span>
            Showing {from} to {to} of {total} entries
          </span>
          <div className="flex items-center gap-1">
            <Button size="xs" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            {Array.from({ length: table.getPageCount() }, (_, i) => (
              <Button
                key={i}
                size="xs"
                variant={i === pageIndex ? "default" : "outline"}
                onClick={() => table.setPageIndex(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button size="xs" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

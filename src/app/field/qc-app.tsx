"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical } from "lucide-react";
import { formatM3 } from "@/components/dispatch/bits";
import { formatClock, type DispatchDay } from "@/lib/dispatch";
import { cn } from "@/lib/utils";
import { testsForPlant, type PlannedTest, type TestStatus } from "./field-data";
import { FieldTestForm, type SavedTest, type TestValues } from "./field-test-form";

/** How long the sample pretends the lab system takes to accept a test. */
const SAVE_DELAY_MS = 800;

const STATUS_TEXT: Record<TestStatus, string> = {
  done: "Done",
  due: "Due now",
  arriving: "Arriving",
  later: "Later",
};

/** What needs the tech now comes first; finished tests sink to the bottom. */
const GROUPS: { title: string; statuses: TestStatus[] }[] = [
  { title: "Due now", statuses: ["due"] },
  { title: "Coming up", statuses: ["arriving", "later"] },
  { title: "Done", statuses: ["done"] },
];

function TestItem({
  test: t,
  record,
  active,
  onSelect,
}: {
  test: PlannedTest;
  record: SavedTest | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const status: TestStatus | "saved" = record?.savedAt != null ? "saved" : t.status;
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        data-testid="qc-test"
        className={cn(
          "flex min-h-16 w-full items-start gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
          active && "border-primary ring-1 ring-primary",
        )}
      >
        <span className="pt-0.5 font-mono text-base font-semibold tabular">{formatClock(t.load.times.on_site)}</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-medium">{t.order.customer}</span>
          <span className="block text-xs text-muted-foreground">
            <span className="font-mono">#{t.load.ticket}</span> · load {t.load.index} of {t.order.loadsTotal}
          </span>
          <span
            className={cn(
              "mt-1 inline-block rounded-md px-1.5 py-0.5 text-xs font-medium",
              (status === "done" || status === "saved") && "bg-emerald-50 text-emerald-800",
              status === "due" && "bg-amber-50 text-amber-900",
              status === "arriving" && "bg-sky-50 text-sky-800",
              status === "later" && "bg-slate-100 text-slate-700",
            )}
          >
            {status === "saved"
              ? `Saved ${formatClock(record!.savedAt!)}`
              : status === "done" && t.result
                ? `Done ${formatClock(t.result.at)}`
                : STATUS_TEXT[status]}
          </span>
        </span>
      </button>
    </li>
  );
}

export function QcApp({ day, plantId }: { day: DispatchDay; plantId: string }) {
  const tests = useMemo(() => testsForPlant(day, plantId), [day, plantId]);
  const firstOpen = tests.find((t) => t.status === "due") ?? tests.find((t) => t.status !== "done") ?? tests[0];
  const [selectedId, setSelectedId] = useState(firstOpen?.load.id ?? null);
  const [saved, setSaved] = useState<Record<string, SavedTest>>({});
  const formHeading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(Date.now());
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);
  const selected = tests.find((t) => t.load.id === selectedId) ?? null;

  function select(t: PlannedTest) {
    setSelectedId(t.load.id);
    // On a phone the form sits above the list: bring it into view so the tap visibly does something.
    requestAnimationFrame(() => {
      formHeading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      formHeading.current?.focus({ preventScroll: true });
    });
  }

  function save(loadId: string, values: TestValues) {
    setSaved((s) => ({ ...s, [loadId]: { values, savedAt: null } }));
    timers.current.push(
      window.setTimeout(() => {
        const at = day.clock + Math.floor((Date.now() - mounted.current) / 60000) + 2;
        setSaved((s) => ({ ...s, [loadId]: { values, savedAt: at } }));
      }, SAVE_DELAY_MS),
    );
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-6 md:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <section aria-labelledby="test-form-heading" className="min-w-0 md:order-2">
        {selected ? (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2
                id="test-form-heading"
                ref={formHeading}
                tabIndex={-1}
                className="scroll-mt-4 text-base font-semibold outline-none"
              >
                Field test for this load
              </h2>
              <p className="mt-0.5 text-sm">
                <span className="font-mono">#{selected.load.ticket}</span> · {selected.order.customer}
              </p>
              <p className="text-xs text-muted-foreground">
                Load {selected.load.index} of {selected.order.loadsTotal} · {formatM3(selected.load.volumeM3)} m³ ·{" "}
                {selected.order.mix.label} · truck{" "}
                <span className="font-mono whitespace-nowrap">{selected.load.truckId ?? "not assigned"}</span>
              </p>
            </div>
            {selected.result ? (
              <RecordedResult test={selected} />
            ) : (
              <FieldTestForm
                key={selected.load.id}
                ticket={selected}
                saved={saved[selected.load.id] ?? null}
                onSave={(values) => save(selected.load.id, values)}
              />
            )}
          </div>
        ) : (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No tests planned today.</p>
        )}
      </section>

      <section aria-labelledby="tests-heading" className="min-w-0 md:order-1">
        <h2 id="tests-heading" className="mb-2 text-sm font-semibold">
          Tests today · {tests.length}
        </h2>
        {GROUPS.map((group) => {
          const items = tests.filter((t) => group.statuses.includes(t.status));
          if (items.length === 0) return null;
          return (
            <div key={group.title} className="mb-4">
              <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">
                {group.title} · {items.length}
              </h3>
              <ol className="grid grid-cols-1 gap-2">
                {items.map((t) => (
                  <TestItem
                    key={t.load.id}
                    test={t}
                    record={saved[t.load.id]}
                    active={t.load.id === selectedId}
                    onSelect={() => select(t)}
                  />
                ))}
              </ol>
            </div>
          );
        })}
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <FlaskConical className="mt-px size-3.5 shrink-0" aria-hidden />
          Sample test plan: the first load of every pour, then one more for every 50 m³ after that.
        </p>
      </section>
    </main>
  );
}

function RecordedResult({ test }: { test: PlannedTest }) {
  const r = test.result!;
  const rows: [string, string][] = [
    ["Slump", `${r.slump} mm`],
    ["Air content", `${r.air} %`],
    ["Concrete temperature", `${r.temp} °C`],
    ["Cylinders taken", String(r.cylinders)],
  ];
  return (
    <div className="p-4">
      <p className="text-sm font-medium text-emerald-800">Recorded at {formatClock(r.at)} and sent to the lab.</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="font-mono font-medium tabular">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

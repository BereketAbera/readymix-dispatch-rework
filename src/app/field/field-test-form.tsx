"use client";

import { useRef, useState } from "react";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, UnitInput } from "@/components/form-field";
import { formatClock } from "@/lib/dispatch";
import { TEST_FIELDS, checkTestValue, specFor, type TestField } from "@/lib/validation";
import type { Ticket } from "./field-data";

export type TestValues = Record<TestField, string> & { notes: string };

export interface SavedTest {
  values: TestValues;
  /** Set once the save has landed; null while it is in flight. */
  savedAt: number | null;
}

const EMPTY: TestValues = { slump: "", air: "", temp: "", cylinders: "", notes: "" };

const same = (a: TestValues, b: TestValues) =>
  TEST_FIELDS.every((f) => a[f].trim() === b[f].trim()) && a.notes.trim() === b.notes.trim();

/**
 * The field test for one load. Saving is owned by the parent, so switching to
 * another test mid-save does not lose it. What counts as saved is a snapshot:
 * an edit made while "Saving…" shows stays an unsaved change.
 */
export function FieldTestForm({
  ticket,
  saved,
  onSave,
}: {
  ticket: Ticket;
  saved: SavedTest | null;
  onSave: (values: TestValues) => void;
}) {
  const spec = specFor(ticket.order);
  const [values, setValues] = useState<TestValues>(saved?.values ?? EMPTY);
  const [touched, setTouched] = useState<Partial<Record<TestField, boolean>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const saving = saved !== null && saved.savedAt === null;
  const dirty = saved ? !same(values, saved.values) : !same(values, EMPTY);
  const isSaved = saved?.savedAt != null && !dirty;

  const check = (f: TestField) => (touched[f] ? checkTestValue(f, values[f], spec) : { error: null, warning: null });
  const change = (f: keyof TestValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [f]: e.target.value }));
  const blur = (f: TestField) => () => setTouched((t) => ({ ...t, [f]: true }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setTouched({ slump: true, air: true, temp: true, cylinders: true });
    const firstBad = TEST_FIELDS.find((f) => checkTestValue(f, values[f], spec).error);
    if (firstBad) {
      formRef.current?.querySelector<HTMLElement>(`#test-${firstBad}`)?.focus();
      return;
    }
    onSave({ ...values });
  }

  const airHint = ticket.order.mix.airPct ? `Spec ${spec.air[0]}–${spec.air[1]} % for this mix` : "Non-air mix: expect under 3 %";

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="test-slump" label="Slump" unitLabel="millimetres" hint={`Spec ${spec.slump[0]}–${spec.slump[1]} mm`} {...check("slump")}>
          <UnitInput unit="mm" className="h-12 text-base" value={values.slump} onChange={change("slump")} onBlur={blur("slump")} />
        </Field>
        <Field id="test-air" label="Air content" unitLabel="percent" hint={airHint} {...check("air")}>
          <UnitInput unit="%" className="h-12 text-base" value={values.air} onChange={change("air")} onBlur={blur("air")} />
        </Field>
        <Field
          id="test-temp"
          label="Concrete temperature"
          unitLabel="degrees Celsius"
          hint={`Spec ${spec.temp[0]}–${spec.temp[1]} °C`}
          {...check("temp")}
        >
          <UnitInput unit="°C" inputMode="text" className="h-12 text-base" value={values.temp} onChange={change("temp")} onBlur={blur("temp")} />
        </Field>
        <Field id="test-cylinders" label="Cylinders taken" hint="Usually 3 per set" {...check("cylinders")}>
          <UnitInput
            unit="cyl."
            inputMode="numeric"
            className="h-12 text-base"
            value={values.cylinders}
            onChange={change("cylinders")}
            onBlur={blur("cylinders")}
          />
        </Field>
      </div>
      <Field id="test-notes" label="Notes" optional>
        <Textarea rows={2} className="text-base" value={values.notes} onChange={change("notes")} />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base sm:w-44"
          disabled={saving || isSaved}
          aria-busy={saving}
          data-testid="save-test"
        >
          {saving && <LoaderCircle className="animate-spin" aria-hidden />}
          {saving ? "Saving…" : isSaved ? "Saved" : saved?.savedAt != null ? "Save changes" : "Save test"}
        </Button>
        <p className="text-sm" role="status">
          {isSaved && saved?.savedAt != null ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
              <CircleCheck className="size-4" aria-hidden />
              Saved at {formatClock(saved.savedAt)} and sent to the lab.
            </span>
          ) : saving ? (
            <span className="text-muted-foreground">Saving…</span>
          ) : dirty ? (
            <span className="text-muted-foreground">Unsaved changes</span>
          ) : (
            <span className="text-muted-foreground">Out-of-spec values can still be saved.</span>
          )}
        </p>
      </div>
    </form>
  );
}

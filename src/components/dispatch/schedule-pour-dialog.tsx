"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, UnitInput } from "@/components/form-field";
import {
  LOAD_SIZE_M3,
  MIX_OPTIONS,
  POUR_TYPE_OPTIONS,
  formatClock,
  normalizeClock,
  parseClock,
  type NewOrderInput,
  type Placement,
  type Plant,
  type PlantId,
  type PourType,
} from "@/lib/dispatch";
import {
  BATCH_LEAD_MIN,
  POUR_FIELDS,
  lastArrival,
  parseDecimal,
  validatePour,
  type PourField,
  type PourValues,
} from "@/lib/validation";

/** How long the sample pretends the server takes to book a pour. */
const SAVE_DELAY_MS = 700;

export function SchedulePourDialog({
  open,
  onOpenChange,
  plants,
  defaultPlant,
  clock,
  onCreate,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plants: Plant[];
  /** The plant the board shows; read each time the dialog opens. */
  defaultPlant: PlantId;
  clock: number;
  onCreate: (input: NewOrderInput) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* The form lives inside the content, which unmounts on close: every open starts fresh. */}
        <SchedulePourForm
          open={open}
          plants={plants}
          defaultPlant={defaultPlant}
          clock={clock}
          onCreate={onCreate}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function SchedulePourForm({
  open,
  plants,
  defaultPlant,
  clock,
  onCreate,
  onCancel,
}: {
  open: boolean;
  plants: Plant[];
  defaultPlant: PlantId;
  clock: number;
  onCreate: (input: NewOrderInput) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<PourValues>(() => ({
    customer: "",
    siteAddress: "",
    plantId: defaultPlant,
    pourType: "Footing",
    mixCode: MIX_OPTIONS[0].code,
    placement: "Chute",
    volume: "",
    start: "",
  }));
  const [touched, setTouched] = useState<Partial<Record<PourField, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // Cancel, Esc or the close button while "Scheduling…" really cancels: the pending save never lands.
  useEffect(() => {
    if (!open) window.clearTimeout(timer.current);
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const errorFor = (name: PourField) => (touched[name] ? validatePour(name, values, clock) : null);
  const set = <K extends keyof PourValues>(key: K, value: PourValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const blur = (name: PourField) => setTouched((t) => ({ ...t, [name]: true }));

  const volume = parseDecimal(values.volume);
  const loads = volume !== null && volume > 0 ? Math.ceil(volume / LOAD_SIZE_M3) : null;
  const start = parseClock(values.start);
  const volumeHint =
    loads && !errorFor("volume")
      ? `${loads} ${loads === 1 ? "load" : "loads"} of up to 8 m³${
          start !== null && volume !== null ? ` · last truck about ${formatClock(lastArrival(start, volume, values.placement))}` : ""
        }`
      : "Up to 8 m³ per truck";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const normalized = { ...values, start: normalizeClock(values.start) };
    setValues(normalized);
    setTouched({ customer: true, siteAddress: true, volume: true, start: true });
    const firstInvalid = POUR_FIELDS.find((name) => validatePour(name, normalized, clock));
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`#pour-${firstInvalid}`)?.focus();
      return;
    }
    setSubmitting(true);
    timer.current = window.setTimeout(() => {
      onCreate({
        plantId: normalized.plantId,
        customer: normalized.customer.trim(),
        siteAddress: normalized.siteAddress.trim(),
        pourType: normalized.pourType,
        mixCode: normalized.mixCode,
        placement: normalized.placement,
        volumeM3: Math.round(parseDecimal(normalized.volume)! * 2) / 2,
        scheduledStart: parseClock(normalized.start)!,
        notes: `Booked from the dispatch board at ${formatClock(clock)}.`,
      });
    }, SAVE_DELAY_MS);
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="shrink-0 px-4 pt-4 pb-3 pr-12">
        <DialogTitle className="text-lg font-semibold">Schedule pour</DialogTitle>
        <DialogDescription>Books the pour for today. Trucks can be assigned right after, from the order.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
        <fieldset disabled={submitting} className="m-0 grid min-w-0 gap-4 border-0 p-0 sm:grid-cols-2">
          <legend className="sr-only">Pour details</legend>
          <Field id="pour-customer" label="Customer" error={errorFor("customer")} className="min-w-0 sm:col-span-2">
            <Input
              className="h-9 max-md:h-11"
              autoComplete="off"
              value={values.customer}
              onChange={(e) => set("customer", e.target.value)}
              onBlur={() => blur("customer")}
            />
          </Field>
          <Field id="pour-siteAddress" label="Site address" error={errorFor("siteAddress")} className="min-w-0 sm:col-span-2">
            <Input
              className="h-9 max-md:h-11"
              autoComplete="off"
              value={values.siteAddress}
              onChange={(e) => set("siteAddress", e.target.value)}
              onBlur={() => blur("siteAddress")}
            />
          </Field>
          <Field
            id="pour-volume"
            label="Volume"
            unitLabel="cubic metres"
            error={errorFor("volume")}
            hint={volumeHint}
            className="min-w-0"
          >
            <UnitInput
              unit="m³"
              className="h-9 max-md:h-11"
              value={values.volume}
              onChange={(e) => set("volume", e.target.value)}
              onBlur={() => blur("volume")}
            />
          </Field>
          <Field
            id="pour-start"
            label="First truck on site"
            error={errorFor("start")}
            hint={`24-hour time, ${formatClock(clock + BATCH_LEAD_MIN)} or later. 1330 works too.`}
            className="min-w-0"
          >
            <Input
              className="h-9 font-mono tabular max-md:h-11"
              inputMode="numeric"
              autoComplete="off"
              value={values.start}
              onChange={(e) => set("start", e.target.value)}
              onBlur={() => {
                set("start", normalizeClock(values.start));
                blur("start");
              }}
            />
          </Field>
          <SelectField
            id="pour-plant"
            label="Plant"
            value={values.plantId}
            onChange={(v) => set("plantId", v as PlantId)}
            options={plants.map((p) => ({ value: p.id, label: p.name }))}
          />
          <SelectField
            id="pour-type"
            label="Pour type"
            value={values.pourType}
            onChange={(v) => set("pourType", v as PourType)}
            options={POUR_TYPE_OPTIONS.map((p) => ({ value: p, label: p }))}
          />
          <SelectField
            id="pour-mix"
            label="Mix"
            value={values.mixCode}
            onChange={(v) => set("mixCode", v)}
            options={MIX_OPTIONS.map((m) => ({ value: m.code, label: m.label }))}
          />
          <SelectField
            id="pour-placement"
            label="Placement"
            value={values.placement}
            onChange={(v) => set("placement", v as Placement)}
            options={(["Chute", "Pump", "Buggy"] as const).map((p) => ({ value: p, label: p }))}
          />
        </fieldset>
      </div>
      <DialogFooter className="mx-0 mb-0 shrink-0">
        <Button
          type="button"
          variant="ghost"
          className="max-md:h-11"
          onClick={() => {
            window.clearTimeout(timer.current);
            onCancel();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} aria-busy={submitting} className="min-w-36 max-md:h-11">
          {submitting && <LoaderCircle className="animate-spin" aria-hidden />}
          {submitting ? "Scheduling…" : "Schedule pour"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

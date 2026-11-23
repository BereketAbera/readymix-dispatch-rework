"use client";

import { useRef, useState } from "react";
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
  parseClock,
  type NewOrderInput,
  type Placement,
  type Plant,
  type PlantId,
  type PourType,
} from "@/lib/dispatch";

interface Values {
  customer: string;
  siteAddress: string;
  plantId: PlantId;
  pourType: PourType;
  mixCode: string;
  placement: Placement;
  volume: string;
  start: string;
}

type FieldName = "customer" | "siteAddress" | "volume" | "start";
const ORDER: FieldName[] = ["customer", "siteAddress", "volume", "start"];

const LAST_START = 18 * 60;
const BATCH_LEAD_MIN = 30;

export function validatePour(name: FieldName, v: Values, clock: number): string | null {
  switch (name) {
    case "customer":
      return v.customer.trim().length < 2 ? "Enter the customer's name." : null;
    case "siteAddress":
      return v.siteAddress.trim().length < 5 ? "Enter the site address so the driver can find it." : null;
    case "volume": {
      if (!v.volume.trim()) return "Enter the volume in cubic metres.";
      const n = Number(v.volume);
      if (!Number.isFinite(n)) return "Use numbers only, for example 24 or 24.5.";
      if (n < 1 || n > 200) return "Enter a volume between 1 and 200 m³.";
      return null;
    }
    case "start": {
      const t = parseClock(v.start);
      const earliest = clock + BATCH_LEAD_MIN;
      if (t === null) return "Enter a start time, for example 13:30.";
      if (t < earliest) return `Pick ${formatClock(earliest)} or later: the plant needs 30 min to batch the first load.`;
      if (t > LAST_START) return "The last start of the day is 18:00.";
      return null;
    }
  }
}

export function SchedulePourDialog({
  open,
  onOpenChange,
  plants,
  defaultPlant,
  clock,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plants: Plant[];
  defaultPlant: PlantId;
  clock: number;
  onCreate: (input: NewOrderInput) => void;
}) {
  const initial: Values = {
    customer: "",
    siteAddress: "",
    plantId: defaultPlant,
    pourType: "Footing",
    mixCode: MIX_OPTIONS[0].code,
    placement: "Chute",
    volume: "",
    start: "",
  };
  const [values, setValues] = useState<Values>(initial);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const errorFor = (name: FieldName) => (touched[name] ? validatePour(name, values, clock) : null);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const blur = (name: FieldName) => () => setTouched((t) => ({ ...t, [name]: true }));

  const volume = Number(values.volume);
  const loads = Number.isFinite(volume) && volume > 0 ? Math.ceil(volume / LOAD_SIZE_M3) : null;

  function reset() {
    setValues(initial);
    setTouched({});
    setSubmitting(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ customer: true, siteAddress: true, volume: true, start: true });
    const firstInvalid = ORDER.find((name) => validatePour(name, values, clock));
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`#pour-${firstInvalid}`)?.focus();
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      onCreate({
        plantId: values.plantId,
        customer: values.customer.trim(),
        siteAddress: values.siteAddress.trim(),
        pourType: values.pourType,
        mixCode: values.mixCode,
        placement: values.placement,
        volumeM3: Math.round(Number(values.volume) * 2) / 2,
        scheduledStart: parseClock(values.start)!,
        notes: `Booked from the dispatch board at ${formatClock(clock)}.`,
      });
      reset();
    }, 700);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Schedule pour</DialogTitle>
          <DialogDescription>
            Books the pour for today. Trucks can be assigned right after, from the order.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={submit} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pour-customer" label="Customer" error={errorFor("customer")} className="sm:col-span-2">
              <Input
                className="h-9"
                autoComplete="off"
                value={values.customer}
                onChange={(e) => set("customer", e.target.value)}
                onBlur={blur("customer")}
              />
            </Field>
            <Field id="pour-siteAddress" label="Site address" error={errorFor("siteAddress")} className="sm:col-span-2">
              <Input
                className="h-9"
                autoComplete="off"
                value={values.siteAddress}
                onChange={(e) => set("siteAddress", e.target.value)}
                onBlur={blur("siteAddress")}
              />
            </Field>
            <Field
              id="pour-volume"
              label="Volume"
              unitLabel="cubic metres"
              error={errorFor("volume")}
              hint={loads && !errorFor("volume") ? `${loads} ${loads === 1 ? "load" : "loads"} of up to 8 m³` : "Up to 8 m³ per truck"}
            >
              <UnitInput
                unit="m³"
                className="h-9"
                value={values.volume}
                onChange={(e) => set("volume", e.target.value)}
                onBlur={blur("volume")}
              />
            </Field>
            <Field
              id="pour-start"
              label="First truck on site"
              error={errorFor("start")}
              hint={`24-hour time, ${formatClock(clock + BATCH_LEAD_MIN)} or later`}
            >
              <Input
                className="h-9 font-mono tabular"
                inputMode="numeric"
                value={values.start}
                onChange={(e) => set("start", e.target.value)}
                onBlur={blur("start")}
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
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} aria-busy={submitting} className="min-w-36">
              {submitting && <LoaderCircle className="animate-spin" aria-hidden />}
              {submitting ? "Scheduling…" : "Schedule pour"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-9 w-full">
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

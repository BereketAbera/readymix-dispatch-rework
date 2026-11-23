import * as React from "react";
import { CircleExclamationPoint, TriangleExclamationPoint } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Label above, control, then one message line: an error (blocks saving),
 * a warning (allowed, but worth a look) or a hint.
 */
export function Field({
  id,
  label,
  unitLabel,
  hint,
  error,
  warning,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  /** Unit read out to screen readers, e.g. "millimetres". */
  unitLabel?: string;
  hint?: string;
  error?: string | null;
  warning?: string | null;
  optional?: boolean;
  className?: string;
  children: React.ReactElement<ControlProps>;
}) {
  const messageId = `${id}-message`;
  const hintId = `${id}-hint`;
  const describedBy = [hint && hintId, (error || warning) && messageId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {unitLabel && <span className="sr-only"> in {unitLabel}</span>}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {React.cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error ? (
        <p id={messageId} className="flex items-start gap-1 text-sm font-medium text-destructive">
          <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : warning ? (
        <p id={messageId} className="flex items-start gap-1 text-sm font-medium text-amber-800">
          <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden />
          {warning}
        </p>
      ) : null}
    </div>
  );
}

/** A number input with its unit as a suffix inside the field. */
export function UnitInput({
  unit,
  className,
  ...props
}: React.ComponentProps<"input"> & { unit: string }) {
  return (
    <div className="relative">
      <Input inputMode="decimal" className={cn("pr-14 tabular", className)} {...props} />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
      >
        {unit}
      </span>
    </div>
  );
}

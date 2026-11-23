import type { Metadata } from "next";
import { formatClock, formatDayLabel, getDispatchDay } from "@/lib/dispatch";
import { DriverApp } from "./driver-app";
import { pickDriverTruck } from "./field-data";
import { FieldShell } from "./field-shell";

export const metadata: Metadata = {
  title: "Field: driver view",
};

export default function DriverPage() {
  const day = getDispatchDay();
  const truck = pickDriverTruck(day);
  const plant = day.plants.find((p) => p.id === truck.plantId);
  return (
    <FieldShell
      active="driver"
      title={
        <>
          Driver · <span className="font-mono">{truck.unit}</span>, {truck.driver}
        </>
      }
      subtitle={
        <>
          {plant?.name} · {formatDayLabel(day.date)} (sample day) · <span className="font-mono">{formatClock(day.clock)}</span>
        </>
      }
    >
      <DriverApp day={day} truck={truck} />
    </FieldShell>
  );
}

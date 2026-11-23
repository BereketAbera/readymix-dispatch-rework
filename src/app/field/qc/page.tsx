import type { Metadata } from "next";
import { formatClock, formatDayLabel, getDispatchDay } from "@/lib/dispatch";
import { testsForPlant } from "../field-data";
import { FieldShell } from "../field-shell";
import { QcApp } from "../qc-app";

export const metadata: Metadata = {
  title: "Field: QC tech view",
};

export default function QcPage() {
  const day = getDispatchDay();
  // The tech shown covers the plant with the most tests due at the board time.
  const due = (plantId: string) => testsForPlant(day, plantId).filter((t) => t.status === "due").length;
  const plant = [...day.plants].sort((a, b) => due(b.id) - due(a.id))[0];
  return (
    <FieldShell
      active="qc"
      title={<>QC tech · field tests, {plant.name}</>}
      subtitle={
        <>
          Slump, air, temperature and cylinders at the truck · {formatDayLabel(day.date)} (sample day) ·{" "}
          <span className="font-mono">{formatClock(day.clock)}</span>
        </>
      }
    >
      <QcApp day={day} plantId={plant.id} />
    </FieldShell>
  );
}

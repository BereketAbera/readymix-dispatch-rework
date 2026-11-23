// Written by design/glyphs.py. Change the drawing there and run design/build.sh, not this file.
import { createLucideIcon } from "lucide-react";

/** A ready-mix truck for 14 and 16 px: a capsule drum tilted rear-up on one pedestal, the cab and two wheels. */
export const MixerTruck = createLucideIcon("mixer-truck", [
  ["path", { d: "M4.69 6.88L11.19 8.78A2.1 2.1 0 0 1 10.01 12.82L3.51 10.92A2.1 2.1 0 0 1 4.69 6.88Z", key: "drum" }],
  ["path", { d: "M11.3 17.5V12.78", key: "pedestal" }],
  ["path", { d: "M7.5 17.5H17", key: "frame" }],
  ["path", { d: "M16.5 17.5V11a1 1 0 0 1 1-1h2l2.5 3.5v3a1 1 0 0 1-1 1", key: "cab" }],
  ["circle", { cx: "5.5", cy: "17.5", r: "2", key: "rear-wheel" }],
  ["circle", { cx: "19", cy: "17.5", r: "2", key: "front-wheel" }],
]);

/** Concrete falling off the chute onto a heap in a shallow form. */
export const ChutePour = createLucideIcon("chute-pour", [
  ["path", { d: "M2 3 10.6 8.4", key: "chute" }],
  ["path", { d: "M10.6 8.4V10.7", key: "stream" }],
  ["path", { d: "M2.5 15.7V19.7h19v-4", key: "form" }],
  ["path", { d: "M6.4 19.7c1.4-3.59 2.8-5.2 4.2-5.2s2.8 1.61 4.2 5.2", key: "heap" }],
]);

/** Stroke width of the mark, in its 32-unit tile. */
export const MARK_STROKE = 2.6;

/** The company mark's drawing for 27 px and up, in the 32-unit space of its tile. Draw it with MARK_STROKE. */
export const MixerMark = createLucideIcon({
  name: "mixer-mark",
  size: 32,
  node: [
    ["path", { d: "M4 9.78Q7.22 8.52 10.05 9.12L13.32 9.82A6.08 3.35 12 0 1 11.92 16.37L8.65 15.68Q5.83 15.08 3.4 12.62Z", key: "drum" }],
    ["path", { d: "M8.84 8.95L12.82 16.53", key: "fin" }],
    ["path", { d: "M12.6 22.6H23.1", key: "frame" }],
    ["path", { d: "M22.6 22.6V15.1a1.2 1.2 0 0 1 1.2-1.2H25.5l3 3.6V21.4a1.2 1.2 0 0 1-1.2 1.2H27.5", key: "cab" }],
    ["circle", { cx: "10.4", cy: "22.6", r: "2.2", key: "rear-wheel" }],
    ["circle", { cx: "25.3", cy: "22.6", r: "2.2", key: "front-wheel" }],
  ],
});

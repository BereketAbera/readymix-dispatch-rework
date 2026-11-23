// Written by design/glyphs.py. Change the drawing there and run design/build.sh, not this file.
import { createLucideIcon } from "lucide-react";

/** A ready-mix truck: the drum tilted rear-up with one spiral fin, the cab and two wheels. Also the company mark. */
export const MixerTruck = createLucideIcon("mixer-truck", [
  ["path", { d: "M2.78 6.78Q5.6 5.33 7.99 5.84A6 3.35 12 0 1 6.6 12.4Q4.2 11.89 2.22 9.42Z", key: "drum" }],
  ["path", { d: "M7.46 5.75L8.45 12.62", key: "fin" }],
  ["path", { d: "M8.5 16.5H15.1", key: "frame" }],
  ["path", { d: "M15.1 16.5V10.2a1 1 0 0 1 1-1H18.5a1 1 0 0 1 .78.37l2.3 2.9a1 1 0 0 1 .22.62V15.5a1 1 0 0 1-1 1h-.6", key: "cab" }],
  ["circle", { cx: "6.5", cy: "16.5", r: "2", key: "rear-wheel" }],
  ["circle", { cx: "17.8", cy: "16.5", r: "2", key: "front-wheel" }],
]);

/** Concrete coming off the chute into an open form. */
export const ChutePour = createLucideIcon("chute-pour", [
  ["path", { d: "M4 4.5 12.9 10.7l1 1.8", key: "chute" }],
  ["path", { d: "M5.5 15v5h15v-5", key: "form" }],
  ["path", { d: "M9.2 20c1.6-2.9 6.2-2.9 7.8 0", key: "heap" }],
]);

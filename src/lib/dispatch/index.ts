import { generateDispatchDay } from "./generate";
import { todayInRegina } from "./time";
import type { DispatchDay } from "./types";

export * from "./types";
export * from "./derive";
export * from "./time";
export {
  BOARD_CLOCK,
  COMPANY,
  LOAD_SIZE_M3,
  LOAD_STAGES,
  PLANTS,
  generateDispatchDay,
} from "./generate";

/** Today's sample board, dated to the current day in America/Regina. */
export function getDispatchDay(now: Date = new Date()): DispatchDay {
  return generateDispatchDay({ date: todayInRegina(now) });
}

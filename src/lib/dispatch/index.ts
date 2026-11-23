import { SAMPLE_DATE, generateDispatchDay } from "./generate";
import type { DispatchDay } from "./types";

export * from "./types";
export * from "./derive";
export * from "./time";
export {
  BOARD_CLOCK,
  COMPANY,
  LOAD_SIZE_M3,
  LOAD_STAGES,
  MIX_OPTIONS,
  PLANTS,
  POUR_TYPE_OPTIONS,
  SAMPLE_DATE,
  createOrder,
  generateDispatchDay,
  spacingForPlacement,
  type NewOrderInput,
} from "./generate";

/** The sample board: one fixed day, shown as of 09:42. */
export function getDispatchDay(): DispatchDay {
  return generateDispatchDay({ date: SAMPLE_DATE });
}

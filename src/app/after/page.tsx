import { Suspense } from "react";
import type { Metadata } from "next";
import { getDispatchDay } from "@/lib/dispatch";
import { BoardSkeleton } from "./board-skeleton";
import { DispatchBoard } from "./dispatch-board";

export const metadata: Metadata = {
  title: "After: reworked dispatch board",
};

/**
 * The page is static (served from the edge, no cold start). Filters, the
 * preview state and the open order are read from the URL in the browser, so
 * the server sends the board's skeleton and the board fills it in.
 */
export default function AfterPage() {
  const day = getDispatchDay();
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <DispatchBoard day={day} />
    </Suspense>
  );
}

import { BoardSkeleton } from "./board-skeleton";

/** Shown the moment a link to the board is tapped, even on a slow connection. */
export default function Loading() {
  return <BoardSkeleton />;
}

import type { Metadata } from "next";
import { getDispatchDay } from "@/lib/dispatch";
import { parseBoardParams } from "./board-params";
import { DispatchBoard } from "./dispatch-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "After: reworked dispatch board",
};

export default async function AfterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseBoardParams(await searchParams);
  const day = getDispatchDay();
  return <DispatchBoard day={day} initial={params} />;
}

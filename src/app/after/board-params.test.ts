import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, boardSearch, clampQuery, parseBoardParams } from "./board-params";

describe("board URL", () => {
  it("round-trips every filter, the preview state and the open order", () => {
    const params = {
      ...DEFAULT_PARAMS,
      plant: "mjw" as const,
      view: "at_risk" as const,
      q: "t-104",
      hour: 10,
      status: ["en_route" as const, "pouring" as const],
      pour: ["Curb and gutter" as const],
      place: ["Pump" as const],
      state: "partial" as const,
      notes: true,
      order: "PRM-24115",
    };
    const search = boardSearch(params);
    expect(search).toBe(
      "?plant=mjw&view=at-risk&q=t-104&hour=10&status=en-route,pouring&pour=curb-and-gutter&place=pump&state=partial&notes=1&order=PRM-24115",
    );
    expect(parseBoardParams(new URLSearchParams(search))).toEqual(params);
  });

  it("writes nothing for the defaults and ignores junk", () => {
    expect(boardSearch(DEFAULT_PARAMS)).toBe("");
    expect(parseBoardParams({ plant: "xyz", view: "nope", hour: "99", order: "DROP TABLE", state: "live" })).toEqual(DEFAULT_PARAMS);
  });

  it("cuts long searches by character, never through an emoji", () => {
    const q = `${"a".repeat(79)}\u{1F600}b`;
    const cut = clampQuery(q);
    expect(Array.from(cut)).toHaveLength(80);
    expect(cut.endsWith("\u{1F600}")).toBe(true);
    expect(parseBoardParams({ q }).q).toBe(cut);
  });
});

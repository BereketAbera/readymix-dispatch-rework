import { describe, expect, it } from "vitest";
import { BOARD_CLOCK, normalizeClock, parseClock } from "@/lib/dispatch";
import { checkTestValue, parseDecimal, specFor, validatePour, type PourValues } from "@/lib/validation";

describe("parseClock: times the way people type them", () => {
  it.each([
    ["13:30", 810],
    ["1330", 810],
    ["930", 570],
    ["0930", 570],
    ["9:30", 570],
    ["13.30", 810],
    ["13 30", 810],
    ["13h30", 810],
    ["9", 540],
    ["13", 780],
    ["1:30 pm", 810],
    ["1:30pm", 810],
    ["1pm", 780],
    ["12 am", 0],
    ["12pm", 720],
    [" 07:05 ", 425],
  ])("reads %j as %i minutes", (text, minutes) => {
    expect(parseClock(text)).toBe(minutes);
  });

  it.each(["", "24:00", "13:60", "7:5", "13:30 pm", "abc", "1e3", "12345", "-1"])("rejects %j", (text) => {
    expect(parseClock(text)).toBeNull();
  });

  it("normalizes to HH:MM and leaves anything else alone", () => {
    expect(normalizeClock("1330")).toBe("13:30");
    expect(normalizeClock("930")).toBe("09:30");
    expect(normalizeClock("soon")).toBe("soon");
  });
});

describe("parseDecimal", () => {
  it("accepts plain decimals with a point or a comma", () => {
    expect(parseDecimal("24")).toBe(24);
    expect(parseDecimal(" 24.5 ")).toBe(24.5);
    expect(parseDecimal("24,5")).toBe(24.5);
    expect(parseDecimal("-3", { allowNegative: true })).toBe(-3);
    expect(parseDecimal("−3", { allowNegative: true })).toBe(-3);
  });

  it.each(["0x10", "1e2", "Infinity", "12abc", "", " ", "-3", ".5", "1.2.3"])("rejects %j", (text) => {
    expect(parseDecimal(text)).toBeNull();
  });
});

const valid: PourValues = {
  customer: "Fescue Homes",
  siteAddress: "120 Furrow St, Regina",
  plantId: "rgn",
  pourType: "Footing",
  mixCode: "C25-20-NA",
  placement: "Chute",
  volume: "24",
  start: "13:30",
};

describe("validatePour", () => {
  it("passes a complete booking", () => {
    for (const field of ["customer", "siteAddress", "volume", "start"] as const) {
      expect(validatePour(field, valid, BOARD_CLOCK)).toBeNull();
    }
  });

  it("accepts a start typed on a phone's number pad", () => {
    expect(validatePour("start", { ...valid, start: "1330" }, BOARD_CLOCK)).toBeNull();
  });

  it("asks for 30 minutes of batching lead time and stops at 18:00", () => {
    expect(validatePour("start", { ...valid, start: "09:50" }, BOARD_CLOCK)).toMatch(/10:12 or later/);
    expect(validatePour("start", { ...valid, start: "18:15" }, BOARD_CLOCK)).toMatch(/last start/);
    expect(validatePour("start", { ...valid, start: "soon" }, BOARD_CLOCK)).toMatch(/13:30 or 1330/);
  });

  it("refuses a pour whose last truck would arrive after the plant closes", () => {
    const big = { ...valid, volume: "200", start: "18:00" };
    expect(validatePour("start", big, BOARD_CLOCK)).toMatch(/runs past 22:00.*next day/);
    expect(validatePour("start", { ...big, volume: "40" }, BOARD_CLOCK)).toBeNull();
  });

  it("rejects volumes that are not plain numbers or out of range", () => {
    expect(validatePour("volume", { ...valid, volume: "0x10" }, BOARD_CLOCK)).toMatch(/numbers only/);
    expect(validatePour("volume", { ...valid, volume: "1e2" }, BOARD_CLOCK)).toMatch(/numbers only/);
    expect(validatePour("volume", { ...valid, volume: "0.5" }, BOARD_CLOCK)).toMatch(/between 1 and 200/);
    expect(validatePour("volume", { ...valid, volume: "" }, BOARD_CLOCK)).toMatch(/Enter the volume/);
  });

  it("needs a customer and a findable site", () => {
    expect(validatePour("customer", { ...valid, customer: " " }, BOARD_CLOCK)).not.toBeNull();
    expect(validatePour("siteAddress", { ...valid, siteAddress: "Lot" }, BOARD_CLOCK)).not.toBeNull();
  });
});

describe("checkTestValue", () => {
  const nonAir = specFor({ mix: { code: "C25-20-NA", strengthMpa: 25, aggregateMm: 20, airPct: 0, label: "" } });
  const airMix = specFor({ mix: { code: "C32-20-A6", strengthMpa: 32, aggregateMm: 20, airPct: 6, label: "" } });

  it("blocks missing and impossible values", () => {
    expect(checkTestValue("slump", "", nonAir).error).toMatch(/Enter the slump/);
    expect(checkTestValue("slump", "abc", nonAir).error).toMatch(/numbers only/);
    expect(checkTestValue("slump", "0x50", nonAir).error).toMatch(/numbers only/);
    expect(checkTestValue("slump", "400", nonAir).error).toMatch(/between 0 and 300/);
    expect(checkTestValue("cylinders", "2.5", nonAir).error).toMatch(/whole cylinders/);
    expect(checkTestValue("cylinders", "1e1", nonAir).error).toMatch(/whole cylinders/);
  });

  it("warns, without blocking, when a value is out of spec", () => {
    expect(checkTestValue("slump", "130", nonAir)).toEqual({ error: null, warning: expect.stringMatching(/Outside spec \(50–110 mm\)/) });
    expect(checkTestValue("air", "4", airMix).warning).toMatch(/5–8/);
    expect(checkTestValue("air", "2", nonAir)).toEqual({ error: null, warning: null });
  });

  it("takes below-zero temperatures and a comma decimal", () => {
    expect(checkTestValue("temp", "-2", nonAir).error).toBeNull();
    expect(checkTestValue("temp", "-2", nonAir).warning).toMatch(/Outside spec/);
    expect(checkTestValue("temp", "18,5", nonAir)).toEqual({ error: null, warning: null });
  });
});

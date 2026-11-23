import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STANDARD, standardMarkdown } from "./standard";

const DOC = fileURLToPath(new URL("../../docs/ui-standard.md", import.meta.url));

describe("UI standard", () => {
  it("gives every rule a unique ID with its section's own prefix", () => {
    const ids = STANDARD.flatMap((s) => s.rules.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STANDARD) {
      expect(s.rules.every((r, i) => r.id === `${s.prefix}${i + 1}`)).toBe(true);
    }
    expect(new Set(STANDARD.map((s) => s.prefix)).size).toBe(STANDARD.length);
  });

  it("keeps docs/ui-standard.md in step with the page (UPDATE_DOCS=1 rewrites it)", () => {
    const markdown = standardMarkdown();
    if (process.env.UPDATE_DOCS) writeFileSync(DOC, markdown);
    expect(readFileSync(DOC, "utf8")).toBe(markdown);
  });
});

export interface StandardRule {
  /** Stable ID for pull requests and reviews, for example "FM3". */
  id: string;
  rule: string;
  why: string;
}

export interface StandardSection {
  id: string;
  prefix: string;
  title: string;
  intro: string;
  rules: StandardRule[];
}

export const SITE_URL = "https://readymix-dispatch-rework.vercel.app";

function section(id: string, prefix: string, title: string, intro: string, rules: [string, string][]): StandardSection {
  return { id, prefix, title, intro, rules: rules.map(([rule, why], i) => ({ id: `${prefix}${i + 1}`, rule, why })) };
}

/**
 * The written UI standard. Rendered at /standard, served as Markdown at
 * /ui-standard.md and kept in docs/ui-standard.md (a test fails if that copy drifts).
 */
export const STANDARD: StandardSection[] = [
  section("tables", "TB", "Tables", "For any list people scan and act on: orders, tickets, lab results, invoices, trucks.", [
    [
      "Rows are 56 px tall, text is 14 px, and a cell holds two lines at most.",
      "Nine orders fit on a 1440 × 900 screen and seven on a laptop 768–800 px tall, under the tiles and the chart, without cramped clicks or taps.",
    ],
    ["Numbers are right-aligned in tabular figures; times are 24-hour HH:MM.", "Digits line up, so totals and outliers stand out without reading every value."],
    ["Units go in the column header (Volume m³), not in every cell.", "Every number stays unambiguous with less noise in the rows."],
    ["Status is a word, an icon and a colour; risk adds a line that says how late.", "Works for colour-blind users and in a sunlit cab, and nobody learns codes."],
    ["The header row stays visible while the table scrolls.", "Column meaning is still clear on row 30."],
    [
      "Columns have a priority and follow the table’s own width: Trucks join at about 860 px of table, Mix and pour at about 1,040 px. Below a 768 px screen the table becomes cards.",
      "Nothing scrolls sideways on a phone, a tablet or a laptop with the sidebar open, and the fields that survive are the ones the job needs.",
    ],
    [
      "Clicking a row opens its detail; actions live there, and destructive ones ask to confirm with the safe choice focused.",
      "Rows stay calm, and nobody cancels an order with a stray click or a second press of Enter.",
    ],
  ]),
  section("filters", "FL", "Filters", "For narrowing a list without losing your place.", [
    ["Saved views are chips with live counts, one for each question people ask all day.", "“What’s at risk?” is one click, and the counts show where the work is."],
    [
      "One search box matches customer, site, truck, ticket, mix and order number; / focuses it, Esc clears it.",
      "Phone calls start with a name, a ticket or a truck number.",
    ],
    ["“Clear all” appears next to the result count as soon as anything is filtered.", "There is always one obvious way back to the full list."],
    [
      "Filter state lives in the URL, for example ?view=at-risk&q=t-104. The open order does too, so Back closes it.",
      "A view can be bookmarked or sent to a colleague, it survives a refresh, and the phone’s back gesture does what people expect.",
    ],
    [
      "Rarely used filters go behind a Filters button; active ones show as removable chips.",
      "The toolbar stays short, the common path stays fast, and nothing narrows the list without saying so.",
    ],
  ]),
  section("forms", "FM", "Forms", "For booking pours, recording tests and anything else people type into.", [
    ["Labels sit above inputs in sentence case; placeholders never replace labels.", "Labels stay visible while typing, and the form reads in one column on a phone."],
    ["Units are suffixes inside the field: mm, %, °C, m³.", "No guessing between mm and cm, and the number stays easy to edit."],
    [
      "Validate when a field loses focus, put the message under it saying how to fix it, and accept input the way people type it: 1330 is 13:30.",
      "Nobody sees red text while still typing, and a phone’s number pad has no colon.",
    ],
    ["Errors block saving; out-of-spec warnings do not.", "Field data has to be recorded even when it is bad news."],
    [
      "One primary button per form, named for the action (Schedule pour, Save test), and always in view.",
      "The next step is always the obvious one, even on a short phone screen.",
    ],
    [
      "Disabled means not possible yet, with the reason shown. Loading changes the label and blocks double submits, and Cancel really cancels.",
      "People can tell whether to wait or to fix something, and nothing happens after they back out.",
    ],
    ["Controls in a row share one height: 36 px with a mouse, 44 px on a phone.", "Rows line up, and every tap target is big enough for a thumb or a glove."],
  ]),
  section("states", "ST", "States", "Every screen designs these four before it ships.", [
    [
      "Loading uses skeletons in the shape of the final layout, never a blank page or a full-screen spinner; counts show as dashes until data arrives.",
      "Nothing jumps when data arrives, and no number is shown before it is known.",
    ],
    ["Empty says what is empty and offers the next action, such as Schedule pour or Clear search.", "An empty screen should lead somewhere, not look broken."],
    [
      "When a refresh fails, keep the last good data on screen, say how old it is and offer Retry.",
      "Dispatch cannot stop; people need to know whether what they see is stale.",
    ],
    [
      "Partial data shows what loaded and flags what didn’t on the rows it affects, with the time of the last good update.",
      "One missing feed should not blank the whole screen.",
    ],
  ]),
  section("charts", "CH", "Charts", "For the numbers above a list, and for dashboards as they are added.", [
    ["One chart answers one question, and its title asks it.", "A chart that tries to answer three questions answers none at a glance."],
    ["Units go in the title or on the axis, with one value axis per chart, never two.", "Two scales on one plot invent correlations that are not in the data."],
    [
      "One hue per measure: done is the dark step, planned the light step. Colour never works alone; a legend or a label names every series.",
      "Readable for colour-blind people, in print and on a dim screen.",
    ],
    [
      "Every value is reachable without hovering (keyboard focus or a table), and charts use the same loading, empty and error states as tables.",
      "Tooltips help; they never gate the numbers.",
    ],
  ]),
];

export const STANDARD_INTRO =
  "One page for tables, filters, forms, states and charts. Every screen in the portal follows it. When a pull request breaks a rule, its description names the rule by ID and says why.";

/** The standard as Markdown, for PR comments and docs/ui-standard.md. */
export function standardMarkdown(): string {
  const lines: string[] = [
    "# UI standard",
    "",
    STANDARD_INTRO,
    "",
    `Live version with working examples: ${SITE_URL}/standard. Link one rule as ${SITE_URL}/standard#FM3.`,
    "",
  ];
  for (const s of STANDARD) {
    lines.push(`## ${s.title} (${s.prefix})`, "", s.intro, "", "| ID | Rule | Why |", "| --- | --- | --- |");
    for (const r of s.rules) lines.push(`| ${r.id} | ${r.rule} | ${r.why} |`);
    lines.push("");
  }
  return lines.join("\n");
}

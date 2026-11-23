export interface Change {
  n: number;
  title: string;
  /** What changed, then why, with the assumption behind it stated as one. */
  text: string;
  /** One line for the legend beside the board. */
  short: string;
}

/**
 * What changed between /before and /after, and why. Used on the home page, the
 * annotation legend and the README. The reasons are assumptions made without
 * talking to the people who use the screen; week-one interviews confirm or replace them.
 */
export const CHANGES: Change[] = [
  {
    n: 1,
    title: "One primary action",
    text: "“Schedule pour” is the one filled button, next to the plant switcher. On the old screen, “New order” was the fifth item in an Actions menu. Assumes dispatch books pours from this screen; if an order desk does the booking, the button moves to their screen and this spot goes to Assign.",
    short: "Schedule pour is the one filled button, beside the plant switcher. It used to be the fifth item in an Actions menu.",
  },
  {
    n: 2,
    title: "Numbers first",
    text: "Four tiles (m³ today, loads en route, trucks available, orders at risk) sit above the table, so whether the day is on track shows before any row is read.",
    short: "Four tiles say whether the day is on track before any row is read.",
  },
  {
    n: 3,
    title: "Saved views instead of a filter panel",
    text: "Chips for Today, At risk, Unassigned and On hold, with live counts, plus a search on the “/” key, replace eight filter fields and an Apply button. Rare filters moved behind a Filters button. Assumes these four are the questions asked most often; to confirm with your dispatchers.",
    short: "Four chips with live counts and a “/” search replace eight filter fields and Apply; rare filters sit behind Filters.",
  },
  {
    n: 4,
    title: "7 columns instead of 14",
    text: "The table drops from 14 equal columns to at most 7, led by start time, customer and site; on narrower screens the least-used columns step out first. Assumes calls start with a customer or a site. If drivers call with ticket numbers, the search already matches them.",
    short: "Led by start time, customer and site. On narrower screens the least-used columns step out first.",
  },
  {
    n: 5,
    title: "Status and progress in plain words",
    text: "Status reads as a word with an icon, late orders say how many minutes behind they are, and loads show as “3/7” with a thin bar, so nobody decodes “ENRT” or subtracts two columns to see where a pour stands.",
    short: "Status words, minutes late and loads as “3/7” instead of codes like ENRT.",
  },
  {
    n: 6,
    title: "Detail without leaving the board",
    text: "Clicking a row opens a side sheet with the load timeline and an inline “Assign truck” control. Hold and Cancel live there, Cancel behind a confirm, so Delete no longer sits beside every row.",
    short: "A row opens a side sheet with the load timeline, Assign truck, Hold and Cancel (behind a confirm).",
  },
  {
    n: 7,
    title: "One set of states",
    text: "Loading, empty, error and partial-data states come from one shared standard: an empty day offers Schedule pour, a failed refresh keeps the last good board with a Retry, and stale GPS is flagged on the rows it affects.",
    short: "Loading, empty, refresh failed and partial data come from one shared standard. Try “Show state”.",
  },
  {
    n: 8,
    title: "Works on a phone and a tablet",
    text: "Below 768 px the table turns into cards with large tap targets; on tablets and laptops the columns follow the table’s own width, so nothing scrolls sideways at any size.",
    short: "Cards below 768 px; columns follow the table’s own width, so nothing scrolls sideways.",
  },
  {
    n: 9,
    title: "A chart that answers one question",
    text: "The m³ tile carries a small chart of concrete due on site per hour, delivered against still to pour, with a line at the board time. It shows where the day’s peak is; click an hour to list the pours in it.",
    short: "Concrete due on site per hour, delivered against still to pour. Click an hour to list its pours.",
  },
];

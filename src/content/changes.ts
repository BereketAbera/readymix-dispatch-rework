export interface Change {
  n: number;
  title: string;
  text: string;
}

/** What changed between /before and /after, and why. Used on the home page, the annotations and the README. */
export const CHANGES: Change[] = [
  {
    n: 1,
    title: "One primary action",
    text: "“Schedule pour” is the one filled button, top right, because booking the next pour is the dispatcher’s most frequent task and it used to sit inside an Actions menu.",
  },
  {
    n: 2,
    title: "Numbers first",
    text: "Four tiles (m³ today, loads en route, trucks available, orders at risk) sit above the table, so the dispatcher knows whether the day is on track before reading a single row.",
  },
  {
    n: 3,
    title: "Saved views, not eight dropdowns",
    text: "Saved views (Today, At risk, Unassigned, On hold) and a search on the “/” key replace eight filter dropdowns, because those are the questions a dispatcher asks all day and each is now one click.",
  },
  {
    n: 4,
    title: "7 columns instead of 14",
    text: "The table drops from 14 equal columns to 7, led by start time, customer and site, because that is how a dispatcher finds a job when a driver or a customer calls.",
  },
  {
    n: 5,
    title: "Status and progress in plain words",
    text: "Status reads as a word with an icon, late orders say how many minutes behind they are, and loads show as “3/7” with a thin bar, so nobody decodes “ENRT” or subtracts two columns to see where a pour stands.",
  },
  {
    n: 6,
    title: "Detail without leaving the board",
    text: "Clicking a row opens a side sheet with the load timeline and an inline “Assign truck” control, so the dispatcher acts without leaving the board, and Delete no longer sits beside every row.",
  },
  {
    n: 7,
    title: "One set of states",
    text: "Loading, empty and error states come from one shared standard, so an empty filter offers a next step and a failed load offers a retry instead of a blank table.",
  },
  {
    n: 8,
    title: "Works on a phone",
    text: "Below tablet width the table turns into cards with the four fields that matter and nothing scrolls sideways, so the board works on a phone in the yard.",
  },
];

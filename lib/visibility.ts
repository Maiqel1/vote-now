import type { ResultsVisibility } from "./types";

export const VISIBILITY_OPTIONS: { value: ResultsVisibility; title: string; description: string }[] = [
  {
    value: "afterClose",
    title: "When voting closes",
    description: "Results appear automatically on the public results page the moment voting ends.",
  },
  {
    value: "manual",
    title: "When I publish them",
    description: "You review the results after voting closes, then publish with one click.",
  },
  {
    value: "live",
    title: "Live, while voting is open",
    description: "Anyone can watch the tallies update in real time. Can influence late voters.",
  },
  {
    value: "private",
    title: "Private",
    description: "Only you and your team ever see the results.",
  },
];


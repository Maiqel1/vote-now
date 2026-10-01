import type { Position } from "./types";

export function positionHint(position: Position): string {
  if (position.type === "yesno") return "Vote Yes or No";
  if (position.type === "multi") return `Choose up to ${position.maxSelections}`;
  return "Choose one";
}

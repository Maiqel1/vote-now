"use client";

import { Button } from "@/components/ui/button";
import { downloadFile, toCsv } from "@/lib/client/voter-import";
import { computeResults } from "@/lib/results";
import type { Ballot, TallyShard } from "@/lib/types";

export function ResultsExport({ ballot, tally, title }: { ballot: Ballot; tally: TallyShard; title: string }) {
  function exportCsv() {
    const results = computeResults(ballot, tally);
    const rows: (string | number)[][] = [["Position", "Candidate / option", "Votes", "Share %", "Outcome"]];
    for (const r of results.positions) {
      if (r.position.type === "yesno") {
        const name = r.position.candidates[0]?.name ?? "";
        const total = r.yes + r.no;
        rows.push([r.position.title, `${name}: Yes`, r.yes, total ? ((r.yes / total) * 100).toFixed(2) : "0", r.passed ? "Approved" : ""]);
        rows.push([r.position.title, `${name}: No`, r.no, total ? ((r.no / total) * 100).toFixed(2) : "0", r.passed === false ? "Rejected" : ""]);
      } else {
        for (const e of r.entries) {
          const outcome = r.winners.includes(e.candidate.id) ? "Elected" : r.tiedIds.includes(e.candidate.id) ? "Tied" : "";
          rows.push([r.position.title, e.candidate.name, e.votes, e.share.toFixed(2), outcome]);
        }
      }
      rows.push([r.position.title, "Abstained", r.abstained, "", ""]);
    }
    rows.push(["", "Total ballots", results.totalBallots, "", ""]);
    downloadFile(`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.csv`, toCsv(rows));
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={exportCsv}>
        Export CSV
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { PrintSlip } from "@/lib/actions/voters";

export function PrintSlips({
  slips,
  electionTitle,
  orgName,
  entryUrl,
  onDone,
}: {
  slips: PrintSlip[];
  electionTitle: string;
  orgName: string;
  entryUrl: string;
  onDone: () => void;
}) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    document.body.classList.add("printing-slips");
    const handle = setTimeout(() => window.print(), 300);
    const after = () => done.current();
    window.addEventListener("afterprint", after);
    return () => {
      clearTimeout(handle);
      document.body.classList.remove("printing-slips");
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return createPortal(
    <div className="print-root fixed inset-0 z-[100] overflow-auto bg-white p-6 text-black print:static print:overflow-visible print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm">
          {slips.length} slip{slips.length === 1 ? "" : "s"} ready. Earlier links and codes for these voters no longer work.
        </p>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm text-white">
            Print
          </button>
          <button onClick={onDone} className="rounded-lg border border-black/20 px-4 py-2 text-sm">
            Close
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 print:gap-2">
        {slips.map((slip) => (
          <div key={slip.email} className="break-inside-avoid rounded-lg border border-dashed border-black/40 p-4 text-[12px] leading-snug">
            <div className="text-[10px] uppercase tracking-wider text-black/60">{orgName}</div>
            <div className="mb-2 font-bold">{electionTitle}</div>
            <div className="mb-2">
              <div className="font-medium">{slip.name || slip.email}</div>
              <div className="text-black/60">{slip.email}</div>
            </div>
            <div className="mb-1">Go to {entryUrl}, enter your email and this code:</div>
            <div className="my-2 rounded bg-black/5 py-2 text-center font-mono text-lg font-bold tracking-[0.3em]">{slip.code}</div>
            <div className="text-[10px] text-black/60">Personal and single-use. Do not share.</div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

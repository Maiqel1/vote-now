"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { addVoters, type AddVotersReport } from "@/lib/actions/voters";
import {
  applyMapping,
  guessMapping,
  parseCsv,
  parsePastedList,
  type ColumnMapping,
  type CsvParseResult,
  type ParsedVoter,
} from "@/lib/client/voter-import";
import { cn } from "@/lib/utils";

type Mode = "single" | "paste" | "csv";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Summary({ report }: { report: AddVotersReport }) {
  return (
    <div className="space-y-2">
      <Notice tone={report.added > 0 ? "success" : "warning"}>
        Added {report.added} voter{report.added === 1 ? "" : "s"}.
        {report.duplicates.length > 0 && ` ${report.duplicates.length} already on the list.`}
        {report.invalid.length > 0 && ` ${report.invalid.length} invalid.`}
        {report.overLimit > 0 && ` ${report.overLimit} not added because of the free plan's voter limit.`}
      </Notice>
      {report.invalid.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
          {report.invalid.slice(0, 50).map((row) => (
            <div key={`${row.row}-${row.value}`}>
              Row {row.row}: “{row.value || "(empty)"}”, {row.reason.toLowerCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddVotersDialog({ electionId, disabled }: { electionId: string; disabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pasted, setPasted] = useState("");
  const [csv, setCsv] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping>({ email: "", name: "", firstName: "", lastName: "" });
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<AddVotersReport | null>(null);

  const candidates: ParsedVoter[] = useMemo(() => {
    if (mode === "single") return email ? [{ email: email.trim(), name: name.trim() }] : [];
    if (mode === "paste") return parsePastedList(pasted);
    return csv && mapping.email ? applyMapping(csv.rows, mapping) : [];
  }, [mode, email, name, pasted, csv, mapping]);

  const validCount = candidates.filter((c) => EMAIL_RE.test(c.email)).length;

  function reset() {
    setEmail("");
    setName("");
    setPasted("");
    setCsv(null);
    setFileName("");
    setReport(null);
  }

  async function loadFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("That file is too large. Keep it under 2 MB.");
      return;
    }
    const parsed = parseCsv(await file.text());
    if (parsed.headers.length === 0) {
      toast.error("Couldn't find a header row. The first row should contain column names like “email” and “name”.");
      return;
    }
    setCsv(parsed);
    setFileName(file.name);
    setMapping(guessMapping(parsed.headers));
  }

  async function submit() {
    setBusy(true);
    const result = await addVoters(electionId, candidates);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setReport(result.data);
    if (result.data.added > 0) router.refresh();
    if (mode === "single" && result.data.added === 1) {
      toast.success("Voter added");
      setEmail("");
      setName("");
      setReport(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled}>+ Add voters</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-playfair text-xl">Add voters</DialogTitle>
          <DialogDescription>Each voter gets a personal ballot link and code when you send invitations.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/50 p-1">
          {(
            [
              ["single", "One voter"],
              ["paste", "Paste a list"],
              ["csv", "Import CSV"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setReport(null);
              }}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors",
                mode === value ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "single" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voter-email">Email</Label>
              <Input id="voter-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voter-name">Name (optional)</Label>
              <Input id="voter-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
        )}

        {mode === "paste" && (
          <div className="space-y-2">
            <Label htmlFor="voter-paste">One voter per line</Label>
            <Textarea
              id="voter-paste"
              className="min-h-[180px] font-mono text-xs"
              placeholder={"ada@school.edu\nGrace Hopper <grace@school.edu>\nalan@school.edu, Alan Turing"}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {candidates.length} line{candidates.length === 1 ? "" : "s"} · {validCount} valid email{validCount === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {mode === "csv" && (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-center transition-colors hover:bg-secondary/40">
              <span className="text-sm text-foreground/80">{fileName || "Choose a .csv file"}</span>
              <span className="text-xs text-muted-foreground">Needs a header row with an email column. Excel: File → Save As → CSV.</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            {csv && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["email", "Email column"],
                      ["name", "Full name column"],
                      ["firstName", "…or first name"],
                      ["lastName", "…and last name"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <NativeSelect value={mapping[key]} onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}>
                        <option value="">{key === "email" ? "Choose…" : "None"}</option>
                        {csv.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  ))}
                </div>
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="bg-secondary/40 px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Preview · {csv.rows.length} rows · {validCount} valid
                  </div>
                  {candidates.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex justify-between gap-3 border-t border-border/50 px-3 py-2 text-xs">
                      <span className={EMAIL_RE.test(c.email) ? "text-foreground/80" : "text-red-400"}>{c.email || "(no email)"}</span>
                      <span className="truncate text-muted-foreground">{c.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {report && <Summary report={report} />}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {report ? "Done" : "Cancel"}
          </Button>
          <Button onClick={submit} disabled={busy || candidates.length === 0}>
            {busy && <Spinner />}
            {mode === "single" ? "Add voter" : `Add ${candidates.length} voter${candidates.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

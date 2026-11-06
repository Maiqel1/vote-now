"use client";

import Link from "next/link";
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
const CHUNK = 1000;
const MAX_FILE_MB = 10;

function Summary({ report, settingsHref }: { report: AddVotersReport; settingsHref: string | null }) {
  return (
    <div className="space-y-2">
      <Notice tone={report.added > 0 ? "success" : "warning"}>
        Added {report.added.toLocaleString()} voter{report.added === 1 ? "" : "s"}.
        {report.duplicates.length > 0 && ` ${report.duplicates.length.toLocaleString()} already on the list.`}
        {report.invalid.length > 0 && ` ${report.invalid.length.toLocaleString()} invalid.`}
        {report.overLimit > 0 && ` ${report.overLimit.toLocaleString()} not added because of this election's voter limit.`}
        {report.overLimit > 0 && settingsHref && (
          <>
            {" "}
            <Link href={settingsHref} className="font-medium underline underline-offset-2">
              Switch to Google sign-in
            </Link>{" "}
            for no voter limit.
          </>
        )}
      </Notice>
      {report.invalid.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
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

export function AddVotersDialog({
  electionId,
  disabled,
  googleAccess,
  settingsHref,
  onAdded,
}: {
  electionId: string;
  disabled?: boolean;
  googleAccess: boolean;
  settingsHref: string | null;
  onAdded?: () => void;
}) {
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
  const [progress, setProgress] = useState<number | null>(null);
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
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`That file is too large. Keep it under ${MAX_FILE_MB} MB, or split it into smaller files.`);
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
    setReport(null);
    const combined: AddVotersReport = { added: 0, duplicates: [], invalid: [], overLimit: 0 };
    let failed: string | null = null;
    for (let start = 0; start < candidates.length; start += CHUNK) {
      if (candidates.length > CHUNK) setProgress(start);
      const chunk = candidates.slice(start, start + CHUNK);
      const result = await addVoters(electionId, chunk);
      if (!result.ok) {
        failed = result.error;
        break;
      }
      combined.added += result.data.added;
      combined.duplicates.push(...result.data.duplicates);
      combined.invalid.push(...result.data.invalid.map((row) => ({ ...row, row: row.row + start })));
      combined.overLimit += result.data.overLimit;
      if (result.data.overLimit > 0) {
        combined.overLimit += Math.max(0, candidates.length - start - chunk.length);
        break;
      }
    }
    setBusy(false);
    setProgress(null);
    if (combined.added > 0) {
      if (onAdded) onAdded();
      else router.refresh();
    }
    if (failed) {
      toast.error(combined.added > 0 ? `${failed} ${combined.added.toLocaleString()} voters were added before this.` : failed);
      if (combined.added === 0) return;
    }
    setReport(combined);
    if (mode === "single" && combined.added === 1) {
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
        if (busy) return;
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled}>+ Add voters</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add voters</DialogTitle>
          <DialogDescription>
            {googleAccess
              ? "Add the email each voter uses to sign in to Google. Only addresses on this list can vote."
              : "Each voter gets a personal ballot link and code when you send invitations."}
          </DialogDescription>
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
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/50 p-6 text-center transition-colors hover:bg-muted/50">
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
                  <div className="bg-muted/50 px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Preview · {csv.rows.length} rows · {validCount} valid
                  </div>
                  {candidates.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex justify-between gap-3 border-t border-border/50 px-3 py-2 text-xs">
                      <span className={EMAIL_RE.test(c.email) ? "text-foreground/80" : "text-danger"}>{c.email || "(no email)"}</span>
                      <span className="truncate text-muted-foreground">{c.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {report && <Summary report={report} settingsHref={settingsHref} />}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {report ? "Done" : "Cancel"}
          </Button>
          <Button onClick={submit} disabled={busy || candidates.length === 0}>
            {busy && <Spinner />}
            {progress !== null
              ? `Adding voters… ${progress.toLocaleString()} of ${candidates.length.toLocaleString()}`
              : mode === "single"
                ? "Add voter"
                : `Add ${candidates.length.toLocaleString()} voter${candidates.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

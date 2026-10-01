"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BallotView, type DraftSelections } from "@/components/election/BallotView";
import { CandidateAvatar } from "@/components/election/CandidateAvatar";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveBallot } from "@/lib/actions/ballot";
import { newClientId } from "@/lib/client/image";
import { uploadElectionImage } from "@/lib/client/upload";
import { FREE_PLAN } from "@/lib/plans";
import type { Ballot, Candidate, Position, PositionType } from "@/lib/types";

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function newPosition(): Position {
  return {
    id: newClientId(),
    title: "",
    description: "",
    type: "single",
    maxSelections: 1,
    allowAbstain: false,
    candidates: [],
  };
}

function newCandidate(): Candidate {
  return { id: newClientId(), name: "", bio: "", photoUrl: null };
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

const ArrowUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const ArrowDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);
const Trash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

function CandidateEditor({
  electionId,
  candidate,
  index,
  count,
  locked,
  onChange,
  onMove,
  onRemove,
}: {
  electionId: string;
  candidate: Candidate;
  index: number;
  count: number;
  locked: boolean;
  onChange: (candidate: Candidate) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const url = await uploadElectionImage(electionId, "candidates", file);
      onChange({ ...candidate, photoUrl: url });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/70 bg-secondary/20 p-4">
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={locked || uploading}
            onClick={() => fileInput.current?.click()}
            className="group relative rounded-full disabled:cursor-default"
            title={locked ? undefined : "Upload photo"}
          >
            <CandidateAvatar name={candidate.name || "?"} photoUrl={candidate.photoUrl} className="h-14 w-14" />
            {!locked && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? <Spinner className="h-4 w-4" /> : "Photo"}
              </span>
            )}
          </button>
          {candidate.photoUrl && !locked && (
            <button type="button" className="text-[10px] text-muted-foreground hover:text-red-400" onClick={() => onChange({ ...candidate, photoUrl: null })}>
              Remove
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <Input placeholder="Candidate name" maxLength={100} value={candidate.name} disabled={locked} onChange={(e) => onChange({ ...candidate, name: e.target.value })} />
          <Textarea
            placeholder="Short bio or manifesto (optional)"
            maxLength={2000}
            value={candidate.bio}
            disabled={locked}
            className="min-h-[70px]"
            onChange={(e) => onChange({ ...candidate, bio: e.target.value })}
          />
        </div>
        {!locked && (
          <div className="flex flex-col">
            <IconButton label="Move up" onClick={() => onMove(index - 1)} disabled={index === 0}>
              <ArrowUp />
            </IconButton>
            <IconButton label="Move down" onClick={() => onMove(index + 1)} disabled={index === count - 1}>
              <ArrowDown />
            </IconButton>
            <IconButton label="Remove candidate" onClick={onRemove}>
              <Trash />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
}

function PositionEditor({
  electionId,
  position,
  index,
  count,
  locked,
  onChange,
  onMove,
  onRemove,
}: {
  electionId: string;
  position: Position;
  index: number;
  count: number;
  locked: boolean;
  onChange: (position: Position) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const setType = (type: PositionType) =>
    onChange({
      ...position,
      type,
      maxSelections: type === "multi" ? Math.max(2, Math.min(position.maxSelections, Math.max(position.candidates.length, 2))) : 1,
      candidates: type === "yesno" ? position.candidates.slice(0, 1) : position.candidates,
    });

  const canAddCandidate = !locked && !(position.type === "yesno" && position.candidates.length >= 1);

  return (
    <div className="glass rounded-2xl">
      <div className="flex items-start gap-3 border-b border-border/60 p-5">
        <span className="mt-2.5 font-mono text-xs text-muted-foreground/60">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1 space-y-3">
          <Input
            placeholder="Position title, e.g. President"
            maxLength={100}
            value={position.title}
            disabled={locked}
            className="font-playfair text-base font-semibold"
            onChange={(e) => onChange({ ...position, title: e.target.value })}
          />
          <Input
            placeholder="Description (optional)"
            maxLength={500}
            value={position.description}
            disabled={locked}
            onChange={(e) => onChange({ ...position, description: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>Voting type</Label>
              <NativeSelect value={position.type} disabled={locked} onChange={(e) => setType(e.target.value as PositionType)}>
                <option value="single">Single choice: pick one</option>
                <option value="multi">Multiple choice: pick up to N</option>
                <option value="yesno">Yes / No: one candidate (uncontested)</option>
              </NativeSelect>
            </div>
            {position.type === "multi" && (
              <div className="space-y-1.5">
                <Label>Up to</Label>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(position.candidates.length, 1)}
                  value={position.maxSelections}
                  disabled={locked}
                  className="w-24"
                  onChange={(e) => onChange({ ...position, maxSelections: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
            )}
            <label className="flex h-11 items-center gap-2 text-sm text-foreground/80">
              <Switch checked={position.allowAbstain} disabled={locked} onCheckedChange={(v) => onChange({ ...position, allowAbstain: v })} />
              Allow abstain
            </label>
          </div>
        </div>
        {!locked && (
          <div className="flex flex-col">
            <IconButton label="Move position up" onClick={() => onMove(index - 1)} disabled={index === 0}>
              <ArrowUp />
            </IconButton>
            <IconButton label="Move position down" onClick={() => onMove(index + 1)} disabled={index === count - 1}>
              <ArrowDown />
            </IconButton>
            <IconButton label="Remove position" onClick={onRemove}>
              <Trash />
            </IconButton>
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        {position.candidates.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {position.type === "yesno" ? "Add the one candidate voters will approve or reject." : "No candidates yet."}
          </p>
        )}
        {position.candidates.map((candidate, ci) => (
          <CandidateEditor
            key={candidate.id}
            electionId={electionId}
            candidate={candidate}
            index={ci}
            count={position.candidates.length}
            locked={locked}
            onChange={(c) => onChange({ ...position, candidates: position.candidates.map((x) => (x.id === c.id ? c : x)) })}
            onMove={(to) => onChange({ ...position, candidates: move(position.candidates, ci, to) })}
            onRemove={() => onChange({ ...position, candidates: position.candidates.filter((x) => x.id !== candidate.id) })}
          />
        ))}
        {canAddCandidate && (
          <Button variant="outline" size="sm" onClick={() => onChange({ ...position, candidates: [...position.candidates, newCandidate()] })}>
            + Add candidate
          </Button>
        )}
      </div>
    </div>
  );
}

export function BallotEditor({ electionId, initial, locked }: { electionId: string; initial: Ballot; locked: boolean }) {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>(initial.positions);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<DraftSelections>({});
  const savedJson = useRef(JSON.stringify(initial.positions));
  const dirty = JSON.stringify(positions) !== savedJson.current;
  const candidateCount = positions.reduce((n, p) => n + p.candidates.length, 0);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true);
    const result = await saveBallot(electionId, { positions });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    savedJson.current = JSON.stringify(positions);
    toast.success("Ballot saved");
    router.refresh();
  }

  return (
    <div className="space-y-5 pb-24">
      {locked && <Notice tone="info">The ballot is locked because voting has started. This protects the integrity of the election.</Notice>}

      {positions.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <h3 className="mb-1 font-playfair text-xl font-bold">Build your ballot</h3>
          <p className="mb-5 text-sm text-muted-foreground">Add each position people are voting for, then the candidates for each.</p>
          {!locked && <Button onClick={() => setPositions([newPosition()])}>+ Add first position</Button>}
        </div>
      )}

      {positions.map((position, i) => (
        <PositionEditor
          key={position.id}
          electionId={electionId}
          position={position}
          index={i}
          count={positions.length}
          locked={locked}
          onChange={(p) => setPositions((all) => all.map((x) => (x.id === p.id ? p : x)))}
          onMove={(to) => setPositions((all) => move(all, i, to))}
          onRemove={() => setPositions((all) => all.filter((x) => x.id !== position.id))}
        />
      ))}

      {!locked && positions.length > 0 && positions.length < FREE_PLAN.positionsPerElection && (
        <Button variant="outline" onClick={() => setPositions((all) => [...all, newPosition()])}>
          + Add position
        </Button>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60"
        style={{ background: "hsl(224 45% 6% / 0.92)", backdropFilter: "blur(16px)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <span className="text-xs text-muted-foreground">
            {positions.length} of {FREE_PLAN.positionsPerElection} positions · {candidateCount} of {FREE_PLAN.candidatesPerElection} candidates
            {dirty && <span className="ml-2 text-amber-400">· Unsaved changes</span>}
          </span>
          <div className="flex gap-2">
            <Dialog onOpenChange={() => setPreview({})}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={positions.length === 0}>
                  Preview as voter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-playfair text-xl">Ballot preview</DialogTitle>
                </DialogHeader>
                <BallotView
                  positions={positions.filter((p) => p.title)}
                  selections={preview}
                  onChange={(id, value) => setPreview((s) => ({ ...s, [id]: value }))}
                />
              </DialogContent>
            </Dialog>
            {!locked && (
              <Button onClick={save} disabled={saving || !dirty}>
                {saving && <Spinner />}
                Save ballot
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

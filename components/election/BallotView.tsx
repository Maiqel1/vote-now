"use client";

import { useState } from "react";
import { positionHint } from "@/lib/ballot-display";
import type { Candidate, Position } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ABSTAIN } from "@/lib/validation";
import { CandidateAvatar } from "./CandidateAvatar";

export type DraftSelections = Record<string, string[]>;

export function isAnswered(position: Position, selections: DraftSelections): boolean {
  return (selections[position.id]?.length ?? 0) > 0;
}

function Indicator({ selected, square }: { selected: boolean; square?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 transition-all",
        square ? "rounded-md" : "rounded-full",
        selected ? "border-brand bg-brand" : "border-border",
      )}
    >
      {selected &&
        (square ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-background" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className="h-2 w-2 rounded-full bg-background" />
        ))}
    </span>
  );
}

function Bio({ candidate }: { candidate: Candidate }) {
  const [open, setOpen] = useState(false);
  if (!candidate.bio) return null;
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="text-xs text-brand-strong hover:text-brand-strong"
      >
        {open ? "Hide manifesto" : "Read manifesto"}
      </button>
      {open && <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{candidate.bio}</p>}
    </div>
  );
}

function OptionRow({
  selected,
  onSelect,
  square,
  disabled,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  square?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role={square ? "checkbox" : "radio"}
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        selected
          ? "border-brand/40 bg-brand-soft"
          : "border-transparent bg-muted/50 hover:border-border hover:bg-secondary/70",
        disabled && "cursor-not-allowed opacity-70",
      )}
    >
      <Indicator selected={selected} square={square} />
      {children}
    </div>
  );
}

export function PositionCard({
  position,
  value,
  onChange,
  disabled,
  index,
}: {
  position: Position;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  index?: number;
}) {
  const abstained = value.length === 1 && value[0] === ABSTAIN;
  const multi = position.type === "multi";

  function toggleCandidate(id: string) {
    if (!multi) {
      onChange([id]);
      return;
    }
    const current = abstained ? [] : value;
    if (current.includes(id)) onChange(current.filter((v) => v !== id));
    else if (current.length < position.maxSelections) onChange([...current, id]);
  }

  return (
    <div
      className="surface animate-fade-up overflow-hidden rounded-2xl"
      style={index !== undefined ? { animationDelay: `${Math.min(index, 8) * 0.07}s` } : undefined}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4 md:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">{position.title}</h2>
          {position.description && <p className="mt-0.5 text-xs text-muted-foreground">{position.description}</p>}
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">{positionHint(position)}</p>
        </div>
        {value.length > 0 && (
          <div className="flex flex-shrink-0 items-center gap-1.5 text-xs font-medium text-success">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {abstained ? "Abstained" : multi ? `${value.length} selected` : "Selected"}
          </div>
        )}
      </div>

      <div className="space-y-2 p-3 md:p-4">
        {position.type === "yesno" && position.candidates[0] ? (
          <>
            <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
              <CandidateAvatar name={position.candidates[0].name} photoUrl={position.candidates[0].photoUrl} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{position.candidates[0].name}</div>
                <Bio candidate={position.candidates[0]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["yes", "no"] as const).map((choice) => (
                <OptionRow key={choice} selected={value[0] === choice} onSelect={() => onChange([choice])} disabled={disabled}>
                  <span className="text-sm font-medium capitalize text-foreground/80">{choice}</span>
                </OptionRow>
              ))}
            </div>
          </>
        ) : (
          position.candidates.map((candidate) => (
            <OptionRow
              key={candidate.id}
              selected={!abstained && value.includes(candidate.id)}
              onSelect={() => toggleCandidate(candidate.id)}
              square={multi}
              disabled={disabled}
            >
              <CandidateAvatar name={candidate.name} photoUrl={candidate.photoUrl} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground/90">{candidate.name}</div>
                <Bio candidate={candidate} />
              </div>
            </OptionRow>
          ))
        )}

        {position.allowAbstain && (
          <OptionRow selected={abstained} onSelect={() => onChange([ABSTAIN])} disabled={disabled}>
            <span className="text-sm text-muted-foreground">Abstain. I don&apos;t want to vote for this position.</span>
          </OptionRow>
        )}
      </div>
    </div>
  );
}

export function BallotView({
  positions,
  selections,
  onChange,
  disabled,
}: {
  positions: Position[];
  selections: DraftSelections;
  onChange: (positionId: string, value: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-5">
      {positions.map((position, i) => (
        <PositionCard
          key={position.id}
          index={i}
          position={position}
          value={selections[position.id] ?? []}
          onChange={(value) => onChange(position.id, value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

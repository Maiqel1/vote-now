"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { TurnstileField, turnstileConfigured } from "@/components/auth/TurnstileField";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { createPoll } from "@/lib/actions/polls";
import { savePoll } from "@/lib/client/poll-storage";
import { DEFAULT_POLL_DURATION, POLL_DURATIONS, POLL_LIMITS, type PollResultsVisibility } from "@/lib/polls";
import { cn } from "@/lib/utils";

const GOOGLE_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

interface DraftQuestion {
  key: number;
  text: string;
  options: string[];
  multi: boolean;
  required: boolean;
}

function SwitchField({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal text-foreground/85">
        {label}
      </Label>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  several,
  onChange,
  onRemove,
}: {
  question: DraftQuestion;
  index: number;
  several: boolean;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const { options } = question;

  function setOption(i: number, value: string) {
    onChange({ options: options.map((o, j) => (j === i ? value : o)) });
  }

  function addOption() {
    if (options.length < POLL_LIMITS.maxOptions) onChange({ options: [...options, ""] });
  }

  function removeOption(i: number) {
    if (options.length > POLL_LIMITS.minOptions) onChange({ options: options.filter((_, j) => j !== i) });
  }

  return (
    <div className={cn("space-y-4", several && "rounded-xl border border-border/70 bg-background/40 p-4")}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`poll-question-${index}`}>{several ? `Question ${n}` : "Your question"}</Label>
          {several && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove question ${n}`}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Input
          id={`poll-question-${index}`}
          value={question.text}
          maxLength={POLL_LIMITS.question}
          autoFocus={index > 0 && question.text === ""}
          placeholder={index === 0 ? "e.g. Where should we hold the end-of-year party?" : "Ask another question"}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        {options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              aria-label={`Question ${n}, option ${i + 1}`}
              value={option}
              maxLength={POLL_LIMITS.option}
              placeholder={`Option ${i + 1}`}
              autoFocus={i >= POLL_LIMITS.minOptions && i === options.length - 1 && option === ""}
              onChange={(e) => setOption(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && i === options.length - 1 && options.length < POLL_LIMITS.maxOptions) {
                  e.preventDefault();
                  addOption();
                }
              }}
            />
            {options.length > POLL_LIMITS.minOptions && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                aria-label={`Remove option ${i + 1} from question ${n}`}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {options.length < POLL_LIMITS.maxOptions && (
          <Button type="button" variant="ghost" size="sm" onClick={addOption} aria-label={`Add an option to question ${n}`}>
            <Plus className="h-4 w-4" />
            Add option
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <SwitchField
          id={`poll-multi-${index}`}
          label="Allow multiple answers"
          checked={question.multi}
          onChange={(multi) => onChange({ multi })}
        />
        {several && (
          <SwitchField
            id={`poll-required-${index}`}
            label="Required"
            checked={question.required}
            onChange={(required) => onChange({ required })}
          />
        )}
      </div>
    </div>
  );
}

export function CreatePollForm({ className }: { className?: string }) {
  const router = useRouter();
  const nextKey = useRef(0);
  const makeQuestion = (): DraftQuestion => ({ key: nextKey.current++, text: "", options: ["", ""], multi: false, required: true });
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [makeQuestion()]);
  const [strict, setStrict] = useState(false);
  const [domains, setDomains] = useState("");
  const [duration, setDuration] = useState<number>(DEFAULT_POLL_DURATION);
  const [visibility, setVisibility] = useState<PollResultsVisibility>("live");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileInstance | undefined>(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const several = questions.length > 1;

  function updateQuestion(key: number, patch: Partial<DraftQuestion>) {
    setQuestions((list) => list.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function addQuestion() {
    setQuestions((list) => (list.length < POLL_LIMITS.maxQuestions ? [...list, makeQuestion()] : list));
  }

  function removeQuestion(key: number) {
    setQuestions((list) => (list.length > 1 ? list.filter((q) => q.key !== key) : list));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await createPoll(
      {
        title,
        questions: questions.map(({ text, options, multi, required }) => ({ text, options, multi, required })),
        strict,
        allowedDomains: strict ? domains : "",
        resultsVisibility: visibility,
        durationMinutes: duration,
      },
      turnstileToken,
    );
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      turnstile.current?.reset();
      setTurnstileToken(null);
      return;
    }
    savePoll({
      code: result.data.code,
      key: result.data.manageKey,
      title: (several ? title : questions[0].text).trim(),
      createdAt: Date.now(),
    });
    router.push(`/p/${result.data.code}/manage#${result.data.manageKey}`);
  }

  return (
    <form onSubmit={submit} className={cn("surface space-y-6 rounded-2xl p-5 text-left md:p-7", className)}>
      {several && (
        <div className="space-y-2">
          <Label htmlFor="poll-title">Poll title</Label>
          <Input
            id="poll-title"
            value={title}
            maxLength={POLL_LIMITS.title}
            placeholder="e.g. End-of-year party plans"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-4">
        {questions.map((question, i) => (
          <QuestionEditor
            key={question.key}
            question={question}
            index={i}
            several={several}
            onChange={(patch) => updateQuestion(question.key, patch)}
            onRemove={() => removeQuestion(question.key)}
          />
        ))}
        {questions.length < POLL_LIMITS.maxQuestions && (
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={addQuestion}>
            <Plus className="h-4 w-4" />
            Add another question
          </Button>
        )}
      </div>

      <div className="grid gap-4 border-t border-border/60 pt-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="poll-duration">Poll runs for</Label>
          <NativeSelect id="poll-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {POLL_DURATIONS.map((d) => (
              <option key={d.minutes} value={d.minutes}>
                {d.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="poll-results">Show results</Label>
          <NativeSelect
            id="poll-results"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PollResultsVisibility)}
          >
            <option value="live">Live, as votes come in</option>
            <option value="afterEnd">Only after the poll ends</option>
          </NativeSelect>
        </div>
      </div>

      {GOOGLE_ENABLED ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="poll-strict" className="text-sm font-medium text-foreground">
                Require Google sign-in
              </Label>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Voters sign in with Google as an extra check. Best for polls where the result really matters.
              </p>
            </div>
            <Switch id="poll-strict" checked={strict} onCheckedChange={setStrict} />
          </div>
          {strict && (
            <div className="space-y-2 rounded-xl border border-border/70 bg-background/40 p-4">
              <Label htmlFor="poll-domains">Only allow emails from (optional)</Label>
              <Input
                id="poll-domains"
                value={domains}
                maxLength={400}
                placeholder="e.g. yourcompany.com"
                onChange={(e) => setDomains(e.target.value)}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Limit voting to your organization or school. Separate several with commas, or leave empty to allow any Google
                account. Works when the organization uses Google for its email.
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">Repeat and automated votes are blocked automatically.</p>
      )}

      <TurnstileField ref={turnstile} action="poll_create" onToken={setTurnstileToken} />
      {error && <Notice tone="error">{error}</Notice>}

      <Button type="submit" className="h-12 w-full rounded-full" disabled={busy || (turnstileConfigured && !turnstileToken)}>
        {busy && <Spinner />}
        Create poll
      </Button>
      <p className="text-center text-xs text-muted-foreground">Free. No account needed. You&apos;ll get a link to share.</p>
    </form>
  );
}

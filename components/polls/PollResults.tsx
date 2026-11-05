import { pluralize } from "@/lib/format";
import { optionShare, type PollChoices, type PollResultsPayload, type QuestionResults } from "@/lib/polls";
import { cn } from "@/lib/utils";

function Bars({ question, mine }: { question: QuestionResults; mine: string[] }) {
  const answered = question.answered ?? 0;
  const top = Math.max(0, ...question.options.map((o) => o.votes ?? 0));
  return (
    <ul className="space-y-4">
      {question.options.map((option) => {
        const votes = option.votes ?? 0;
        const share = optionShare(votes, answered);
        const leading = top > 0 && votes === top;
        return (
          <li key={option.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className={cn("min-w-0 break-words", leading ? "font-semibold text-foreground" : "text-foreground/85")}>
                {option.label}
                {mine.includes(option.id) && (
                  <span className="ml-2 whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wider text-brand-strong">
                    Your pick
                  </span>
                )}
              </span>
              <span className="flex-shrink-0 tabular-nums text-muted-foreground">
                {share}% · {votes.toLocaleString()}
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-muted"
              role="meter"
              aria-label={option.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={share}
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-700 ease-out", leading ? "bg-brand" : "bg-foreground/25")}
                style={{ width: `${share}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PollResultsView({
  results,
  mine = {},
  note,
}: {
  results: PollResultsPayload;
  mine?: PollChoices;
  note?: React.ReactNode;
}) {
  if (results.hidden) {
    return (
      <div className="surface rounded-2xl p-6 text-center">
        <div className="text-sm font-medium text-foreground">Results are hidden until the poll ends</div>
        <p className="mt-1 text-xs text-muted-foreground">{pluralize(results.total, "vote")} so far</p>
      </div>
    );
  }

  const several = results.questions.length > 1;
  const first = results.questions[0];
  const summary = (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>
        {pluralize(results.total, "voter")}
        {!several && first?.multi && " · voters could pick more than one"}
      </span>
      {note}
    </div>
  );

  if (!several && first) {
    return (
      <div className="surface rounded-2xl p-5 md:p-6">
        <Bars question={first} mine={mine[first.id] ?? []} />
        <div className="mt-5 border-t border-border/60 pt-4">{summary}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.questions.map((question, i) => (
        <div key={question.id} className="surface rounded-2xl p-5 md:p-6">
          <div className="mb-4">
            <h3 className="break-words text-sm font-semibold text-foreground">
              <span className="text-muted-foreground">{i + 1}.</span> {question.text}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {(question.answered ?? 0).toLocaleString()} answered
              {question.multi && " · more than one allowed"}
              {!question.required && " · optional"}
            </p>
          </div>
          <Bars question={question} mine={mine[question.id] ?? []} />
        </div>
      ))}
      <div className="px-1">{summary}</div>
    </div>
  );
}

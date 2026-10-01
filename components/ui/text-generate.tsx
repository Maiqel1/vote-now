import { cn } from "@/lib/utils";

export function TextGenerate({
  text,
  highlight = [],
  className,
}: {
  text: string;
  highlight?: string[];
  className?: string;
}) {
  const marked = new Set(highlight.map((w) => w.toLowerCase()));

  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <span
          key={`${word}-${i}`}
          className={cn(
            "inline-block animate-word-in motion-reduce:animate-none",
            marked.has(word.replace(/[.,!?]/g, "").toLowerCase()) && "text-brand",
          )}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          {word}
          {" "}
        </span>
      ))}
    </span>
  );
}

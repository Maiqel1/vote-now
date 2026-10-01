export function SettingsSection({
  title,
  description,
  children,
  tone,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <section
      className={`grid gap-6 rounded-2xl p-6 md:grid-cols-[240px_1fr] ${
        tone === "danger" ? "border border-danger/30 bg-danger-soft" : "surface"
      }`}
    >
      <div>
        <h2 className={`text-lg font-bold ${tone === "danger" ? "text-danger" : ""}`}>{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

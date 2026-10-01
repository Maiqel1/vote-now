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
        tone === "danger" ? "border border-red-500/20 bg-red-500/[0.03]" : "glass"
      }`}
    >
      <div>
        <h2 className={`font-playfair text-lg font-bold ${tone === "danger" ? "text-red-300" : ""}`}>{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

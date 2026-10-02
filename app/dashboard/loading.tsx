export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-10 md:px-6" aria-busy="true" aria-label="Loading">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="skeleton h-12 w-40 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="surface rounded-2xl p-5">
            <div className="skeleton mb-4 h-5 w-20 rounded-full" />
            <div className="skeleton mb-2 h-5 w-3/4" />
            <div className="skeleton mb-6 h-3 w-1/2" />
            <div className="skeleton h-3 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}

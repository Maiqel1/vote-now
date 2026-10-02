export default function ElectionTabLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="skeleton h-6 w-48" />
        <div className="flex gap-2">
          <div className="skeleton h-10 w-28" />
          <div className="skeleton h-10 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="surface rounded-2xl p-5">
            <div className="skeleton mb-3 h-9 w-16" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="surface space-y-4 rounded-2xl p-6">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

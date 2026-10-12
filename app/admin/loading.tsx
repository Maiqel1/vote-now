export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="surface rounded-2xl p-4">
            <div className="skeleton mb-3 h-3 w-20" />
            <div className="skeleton mb-2 h-7 w-24" />
            <div className="skeleton h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="surface rounded-2xl p-5">
            <div className="skeleton mb-4 h-4 w-28" />
            <div className="skeleton h-36 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

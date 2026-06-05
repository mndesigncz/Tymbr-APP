export default function DashboardLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
          <div className="h-4 w-72 rounded-lg" style={{ background: "var(--bg-subtle)" }} />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
          <div className="h-10 w-28 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-3xl" style={{ background: "var(--bg-card)" }} />
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 rounded-3xl" style={{ background: "var(--bg-card)" }} />
        <div className="h-64 rounded-3xl" style={{ background: "var(--bg-card)" }} />
      </div>

      <div className="h-72 rounded-3xl" style={{ background: "var(--bg-card)" }} />
    </div>
  );
}

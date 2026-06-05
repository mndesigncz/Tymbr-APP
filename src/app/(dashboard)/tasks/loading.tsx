export default function TasksLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
          <div className="h-9 w-24 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex gap-2 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-lg" style={{ background: "var(--bg-subtle)" }} />
        ))}
      </div>

      {/* Task cards */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 rounded-2xl" style={{ background: "var(--bg-card)" }} />
      ))}
    </div>
  );
}

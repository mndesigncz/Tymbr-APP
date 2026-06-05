export default function TimeLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-5 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-36 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
        <div className="h-9 w-32 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-3xl" style={{ background: "var(--bg-card)" }} />
        ))}
      </div>

      {/* Entry rows */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-16 rounded-2xl" style={{ background: "var(--bg-card)" }} />
      ))}
    </div>
  );
}

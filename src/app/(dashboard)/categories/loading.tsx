export default function CategoriesLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-5 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-40 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
        <div className="h-9 w-32 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: "var(--bg-card)" }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
        ))}
      </div>

      {/* Item list */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 rounded-2xl" style={{ background: "var(--bg-card)" }} />
      ))}
    </div>
  );
}

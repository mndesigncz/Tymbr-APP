export default function FilesLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-5 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-28 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
        <div className="h-9 w-32 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
      </div>

      {/* Folder row */}
      <div className="flex gap-3 flex-wrap">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 w-36 rounded-2xl" style={{ background: "var(--bg-card)" }} />
        ))}
      </div>

      {/* File grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl" style={{ background: "var(--bg-card)" }} />
        ))}
      </div>
    </div>
  );
}

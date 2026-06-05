export default function SettingsLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="h-7 w-36 rounded-xl mb-8" style={{ background: "var(--bg-subtle)" }} />

      {/* Profile card */}
      <div className="rounded-3xl p-6 space-y-4" style={{ background: "var(--bg-card)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl" style={{ background: "var(--bg-subtle)" }} />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-lg" style={{ background: "var(--bg-subtle)" }} />
            <div className="h-3.5 w-44 rounded-lg" style={{ background: "var(--bg-subtle)" }} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
          ))}
        </div>
        <div className="h-10 w-24 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
      </div>

      {/* Notifications card */}
      <div className="rounded-3xl p-6 space-y-3" style={{ background: "var(--bg-card)" }}>
        <div className="h-4 w-40 rounded-lg mb-4" style={{ background: "var(--bg-subtle)" }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-48 rounded-lg" style={{ background: "var(--bg-subtle)" }} />
            <div className="h-6 w-10 rounded-full" style={{ background: "var(--bg-subtle)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

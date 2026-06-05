export default function ChatLoading() {
  return (
    <div className="flex h-full animate-pulse">
      {/* Contacts list */}
      <div
        className="w-64 flex-shrink-0 border-r p-4 space-y-3 hidden lg:block"
        style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
      >
        <div className="h-8 w-full rounded-xl mb-4" style={{ background: "var(--bg-subtle)" }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: "var(--bg-subtle)" }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded" style={{ background: "var(--bg-subtle)" }} />
              <div className="h-3 w-1/2 rounded" style={{ background: "var(--bg-subtle)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Message area */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b px-6 flex items-center" style={{ borderColor: "var(--border)" }}>
          <div className="h-5 w-40 rounded-lg" style={{ background: "var(--bg-subtle)" }} />
        </div>
        <div className="flex-1 p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
              <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: "var(--bg-subtle)" }} />
              <div
                className="h-12 rounded-2xl"
                style={{ background: "var(--bg-subtle)", width: `${140 + (i * 30) % 100}px` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

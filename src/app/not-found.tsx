import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={{ background: "var(--bg-page)" }}
    >
      <p className="text-[80px] font-black leading-none mb-4" style={{ color: "var(--text-3)", opacity: 0.3 }}>
        404
      </p>
      <h1 className="text-[22px] font-bold mb-2" style={{ color: "var(--text-1)" }}>
        Stránka nenalezena
      </h1>
      <p className="text-[14px] mb-8 max-w-xs" style={{ color: "var(--text-3)" }}>
        Stránka, kterou hledáte, neexistuje nebo byla přesunuta.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all hover:opacity-90"
        style={{ background: "var(--accent)" }}
      >
        Zpět na přehled
      </Link>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "#EF44440A", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-[18px] font-bold mb-2" style={{ color: "var(--text-1)" }}>
        Něco se pokazilo
      </h2>
      <p className="text-[14px] mb-6 max-w-sm" style={{ color: "var(--text-3)" }}>
        Při načítání stránky nastala chyba. Zkuste to prosím znovu.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all hover:opacity-90"
        style={{ background: "var(--accent)" }}
      >
        Zkusit znovu
      </button>
    </div>
  );
}

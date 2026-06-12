"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { StartWorkButton } from "@/components/layout/StartWorkButton";
import { CalendarView } from "@/components/calendar/CalendarView";
import { Plus, CalendarPlus } from "lucide-react";

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarPageContent />
    </Suspense>
  );
}

function CalendarPageContent() {
  const { data: session } = useSession();
  const canUseTeam = !!(session?.user as any)?.teamId;

  return (
    <div className="max-w-[1280px] mx-auto w-full">
      <Header
        title="Kalendář"
        subtitle="Události a termíny úkolů na jednom místě"
        actions={
          <div className="flex items-center gap-2">
            <StartWorkButton />
            <Link href="/calendar?new=event">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-black/[0.03]"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}>
                <CalendarPlus className="w-4 h-4" />
                <span>Událost</span>
              </button>
            </Link>
            <Link href="/tasks/new">
              <button className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all hover:opacity-90 shadow-sm"
                style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(247,89,47,0.25)" }}>
                <Plus className="w-4 h-4" />
                <span>Nový úkol</span>
              </button>
            </Link>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        <CalendarView canUseTeam={canUseTeam} />
      </div>
    </div>
  );
}

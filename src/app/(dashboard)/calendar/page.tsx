"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { CalendarView } from "@/components/calendar/CalendarView";

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
    <div>
      <Header
        title="Kalendář"
        subtitle="Události a termíny úkolů na jednom místě"
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        <CalendarView canUseTeam={canUseTeam} />
      </div>
    </div>
  );
}

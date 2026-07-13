import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { WorkMode } from "@/components/layout/WorkMode";
import { TeamBrandingLoader } from "@/components/layout/TeamBrandingLoader";
import { TimeTrackerProvider } from "@/context/TimeTrackerContext";
import { KeyboardShortcutsProvider } from "@/components/layout/KeyboardShortcutsProvider";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { FloatingDock } from "@/components/layout/FloatingDock";
import { TimerCorrection } from "@/components/layout/TimerCorrection";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <TimeTrackerProvider>
      <TeamBrandingLoader />
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-page)" }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0 min-w-0" style={{ overflowX: "clip" }}>
          {children}
        </main>
        <BottomNav />
      </div>
      <WorkMode />
      <TimerCorrection />
      <GlobalSearch />
      <FloatingDock />
      <KeyboardShortcutsProvider />
    </TimeTrackerProvider>
  );
}

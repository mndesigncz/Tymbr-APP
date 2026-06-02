import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { WorkMode } from "@/components/layout/WorkMode";
import { TimeTrackerProvider } from "@/context/TimeTrackerContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <TimeTrackerProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-page)" }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
      <WorkMode />
    </TimeTrackerProvider>
  );
}

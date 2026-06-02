import { Header } from "@/components/layout/Header";
import { TaskForm } from "@/components/tasks/TaskForm";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function NewTaskPage({ searchParams }: Props) {
  const { status } = await searchParams;
  return (
    <div>
      <Header title="Nový úkol" />
      <div className="p-6 max-w-xl mx-auto">
        <div className="rounded-xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
          <TaskForm defaultStatus={status} />
        </div>
      </div>
    </div>
  );
}

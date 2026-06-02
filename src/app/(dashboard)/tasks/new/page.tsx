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
      <div className="px-6 lg:px-8 pt-6 pb-10 max-w-xl mx-auto">
        <div className="rounded-3xl border p-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <TaskForm defaultStatus={status} />
        </div>
      </div>
    </div>
  );
}

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
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-6">
          <TaskForm defaultStatus={status} />
        </div>
      </div>
    </div>
  );
}

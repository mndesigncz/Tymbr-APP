export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type UserRole = "admin" | "member";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | null;
  startDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  categoryId?: string | null;
  category?: Category | null;
  createdById: string;
  createdBy?: User;
  assigneeId?: string | null;
  assignee?: User | null;
  comments?: Comment[];
  _count?: { comments: number };
}

export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  taskId: string;
  userId: string;
  user?: User;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "K provedení",
  in_progress: "Probíhá",
  review: "Ke schválení",
  done: "Hotovo",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
  urgent: "Urgentní",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "#6B7280",
  in_progress: "#3B82F6",
  review: "#EAB308",
  done: "#22C55E",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "#6B7280",
  medium: "#3B82F6",
  high: "#F97316",
  urgent: "#EF4444",
};

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TeamRole = "owner" | "admin" | "member";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  color?: string | null;
  logo?: string | null;
  createdAt: Date;
  ownerId: string;
  owner?: User;
  members?: TeamMember[];
  invitations?: TeamInvitation[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  user?: User;
  team?: Team;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  token: string;
  role: TeamRole;
  createdAt: Date;
  expiresAt?: Date | null;
  acceptedAt?: Date | null;
  team?: Team;
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
  completedAt?: Date | string | null;
  hourlyRate?: number | null;
  createdAt: Date;
  updatedAt: Date;
  teamId?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  createdById: string;
  createdBy?: User;
  assigneeId?: string | null;
  assignee?: User | null;
  assignees?: User[];
  comments?: Comment[];
  timeEntries?: TimeEntry[];
  subtasks?: SubTask[];
  statusHistory?: TaskStatusHistory[];
  visibility?: string;
  recurring?: string;
  icon?: string | null;
  blockedByCount?: number;
  _count?: { comments: number };
}

export interface SubTask {
  id: string;
  title: string;
  description?: string | null;
  hourlyRate?: number | null;
  done: boolean;
  order: number;
  createdAt: Date | string;
  taskId: string;
  assigneeId?: string | null;
  assignee?: User | null;
  timeEntries?: TimeEntry[];
}

export type EventVisibility = "personal" | "team";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startAt: Date | string;
  endAt: Date | string;
  allDay: boolean;
  location?: string | null;
  color?: string | null;
  visibility: EventVisibility;
  createdAt: Date | string;
  updatedAt: Date | string;
  teamId?: string | null;
  createdById: string;
  createdBy?: User;
}

export interface TaskStatusHistory {
  id: string;
  taskId: string;
  status: TaskStatus;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  minutes?: number | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  taskId: string;
  userId: string;
  user?: User;
}

export interface TimeEntry {
  id: string;
  startedAt: Date | string;
  stoppedAt?: Date | string | null;
  durationMinutes?: number | null;
  createdAt: Date | string;
  userId: string;
  taskId: string;
  subtaskId?: string | null;
  task?: Task;
  subtask?: SubTask;
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

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Vlastník",
  admin: "Admin",
  member: "Člen",
};

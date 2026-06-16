// Shared cost/price estimation for tasks. A task's estimated price ("cena
// zakázky") is the labour of the task itself plus each subtask (estimated
// time × hourly rate, subtask falling back to the task rate when it has none)
// plus any one-off expenses (materiál apod.).

export interface EstimateSubtaskInput {
  minutes?: number | null;
  rate?: number | null;
}

export interface EstimateInput {
  taskMinutes?: number | null;
  taskRate?: number | null;
  expenses?: number | null;
  subtasks?: EstimateSubtaskInput[];
}

export interface EstimateResult {
  laborTask: number;
  laborSubtasks: number;
  expenses: number;
  total: number;
  totalMinutes: number;
  /** True when there is anything at all to show. */
  hasData: boolean;
}

export function computeEstimate(input: EstimateInput): EstimateResult {
  const taskRate = num(input.taskRate);
  const taskMinutes = num(input.taskMinutes);
  const laborTask = (taskMinutes / 60) * taskRate;

  let laborSubtasks = 0;
  let subMinutes = 0;
  for (const s of input.subtasks ?? []) {
    const minutes = num(s.minutes);
    const rate = s.rate != null && s.rate !== ("" as any) ? num(s.rate) : taskRate;
    laborSubtasks += (minutes / 60) * rate;
    subMinutes += minutes;
  }

  const expenses = num(input.expenses);
  const totalMinutes = taskMinutes + subMinutes;
  const total = laborTask + laborSubtasks + expenses;

  return {
    laborTask,
    laborSubtasks,
    expenses,
    total,
    totalMinutes,
    hasData: totalMinutes > 0 || expenses > 0 || total > 0,
  };
}

function num(v: number | null | undefined): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && isFinite(n) ? n : 0;
}

/** Format a number of CZK without unnecessary decimals: 1234.5 → "1 235 Kč". */
export function formatCZK(value: number): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString("cs-CZ")} Kč`;
}

/** Convert minutes to a compact human label: 90 → "1,5 h", 30 → "30 min". */
export function formatDuration(minutes: number): string {
  if (!minutes) return "0 h";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  const label = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(".", ",");
  return `${label} h`;
}

/** Convert an hours string/number (e.g. "1.5") to whole minutes for storage. */
export function hoursToMinutes(hours: string | number | null | undefined): number | null {
  const n = typeof hours === "string" ? parseFloat(hours.replace(",", ".")) : hours;
  if (n == null || !isFinite(n) || n <= 0) return null;
  return Math.round(n * 60);
}

/** Convert stored minutes back to an hours string for an input field. */
export function minutesToHours(minutes: number | null | undefined): string {
  if (!minutes) return "";
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)));
}

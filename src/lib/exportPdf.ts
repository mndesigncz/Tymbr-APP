import type { Task } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  todo: "K provedení",
  in_progress: "Probíhá",
  review: "Ke kontrole",
  done: "Hotovo",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
  urgent: "Urgentní",
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export async function exportTasksToPdf(tasks: Task[], title = "Úkoly") {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text(`Exportováno ${fmtDate(new Date())} · celkem ${tasks.length} úkolů`, 14, 25);
  doc.setTextColor(0, 0, 0);

  const rows = tasks.map((t) => [
    t.title,
    STATUS_LABELS[t.status] ?? t.status,
    PRIORITY_LABELS[t.priority] ?? t.priority,
    t.category?.name ?? "—",
    [t.assignee, ...(t.assignees ?? [])].filter(Boolean).map((u) => u!.name).join(", ") || "—",
    fmtDate(t.dueDate),
    fmtDate(t.completedAt),
  ]);

  autoTable(doc, {
    startY: 30,
    head: [["Název", "Status", "Priorita", "Kategorie", "Řešitel", "Termín", "Dokončeno"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [247, 89, 47], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 35 },
      4: { cellWidth: 45 },
      5: { cellWidth: 25 },
      6: { cellWidth: 28 },
    },
  });

  const filename = `${title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

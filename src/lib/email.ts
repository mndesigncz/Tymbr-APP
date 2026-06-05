import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

// Returns false if the recipient has turned off the given notification type.
async function prefAllows(email: string, key: "taskAssigned" | "comments" | "dueDates" | "statusChanges"): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { notificationPrefs: true } });
    if (!user?.notificationPrefs) return true; // no prefs saved → default on
    const prefs = JSON.parse(user.notificationPrefs);
    return prefs[key] !== false;
  } catch {
    return true; // never block a notification on a lookup error
  }
}
const FROM = process.env.RESEND_FROM_EMAIL ?? "Tymbr <noreply@tymbr.app>";
const APP_URL = (process.env.NEXTAUTH_URL ?? "https://tymbr.app").replace(/\/$/, "");

function base(content: string) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827}
    .wrap{max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
    .header{background:#f7592f;padding:32px 32px 24px;text-align:center}
    .header h1{margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px}
    .body{padding:32px}
    .body p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151}
    .btn{display:inline-block;background:#f7592f;color:#fff!important;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;margin:8px 0 16px}
    .footer{padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center}
    .footer p{margin:0;font-size:12px;color:#9ca3af}
    .link{color:#f7592f;word-break:break-all;font-size:13px}
  </style></head><body><div class="wrap">${content}</div></body></html>`;
}

export async function sendInvitationEmail({
  to, token, teamName, inviterName,
}: {
  to: string;
  token: string;
  teamName: string;
  inviterName: string;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const url = `${APP_URL}/invite/${token}`;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${inviterName} vás zve do týmu „${teamName}" na Tymbr`,
      html: base(`
        <div class="header"><h1>Tymbr</h1></div>
        <div class="body">
          <p>Ahoj,</p>
          <p><strong>${inviterName}</strong> vás pozval/a do týmu <strong>${teamName}</strong> na platformě Tymbr.</p>
          <p>Klikněte na tlačítko níže a pozvánku přijměte:</p>
          <a href="${url}" class="btn">Přijmout pozvánku</a>
          <p>Nebo zkopírujte tento odkaz do prohlížeče:</p>
          <p><a href="${url}" class="link">${url}</a></p>
          <p>Pozvánka vyprší za 7 dní.</p>
        </div>
        <div class="footer"><p>Tymbr · Pokud tuto pozvánku neočekáváte, můžete tento e-mail ignorovat.</p></div>
      `),
    });
    return true;
  } catch (err) {
    console.error("[email] sendInvitationEmail failed:", err);
    return false;
  }
}

export async function sendTaskAssignedEmail({
  to, assigneeName, taskTitle, taskId, assignerName,
}: {
  to: string;
  assigneeName: string;
  taskTitle: string;
  taskId: string;
  assignerName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  if (!(await prefAllows(to, "taskAssigned"))) return;
  const url = `${APP_URL}/tasks/${taskId}`;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Byl/a jste přiřazen/a k úkolu: ${taskTitle}`,
      html: base(`
        <div class="header"><h1>Tymbr</h1></div>
        <div class="body">
          <p>Ahoj ${assigneeName},</p>
          <p><strong>${assignerName}</strong> vám přiřadil/a nový úkol:</p>
          <p style="font-size:17px;font-weight:700;color:#111827;margin:20px 0">${taskTitle}</p>
          <a href="${url}" class="btn">Zobrazit úkol</a>
          <p>Nebo zkopírujte tento odkaz:</p>
          <p><a href="${url}" class="link">${url}</a></p>
        </div>
        <div class="footer"><p>Tymbr · Nastavení notifikací lze změnit v nastavení účtu.</p></div>
      `),
    });
  } catch (err) {
    console.error("[email] sendTaskAssignedEmail failed:", err);
  }
}

export async function sendCommentEmail({
  to, recipientName, taskTitle, taskId, commenterName, commentPreview,
}: {
  to: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  commenterName: string;
  commentPreview: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  if (!(await prefAllows(to, "comments"))) return;
  const url = `${APP_URL}/tasks/${taskId}`;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Nový komentář k úkolu: ${taskTitle}`,
      html: base(`
        <div class="header"><h1>Tymbr</h1></div>
        <div class="body">
          <p>Ahoj ${recipientName},</p>
          <p><strong>${commenterName}</strong> přidal/a komentář k úkolu <strong>${taskTitle}</strong>:</p>
          <p style="border-left:3px solid #f7592f;padding:8px 16px;margin:16px 0;color:#374151;font-style:italic">${commentPreview}</p>
          <a href="${url}" class="btn">Zobrazit úkol</a>
          <p>Nebo zkopírujte tento odkaz:</p>
          <p><a href="${url}" class="link">${url}</a></p>
        </div>
        <div class="footer"><p>Tymbr · Nastavení notifikací lze změnit v nastavení účtu.</p></div>
      `),
    });
  } catch (err) {
    console.error("[email] sendCommentEmail failed:", err);
  }
}

export async function sendStatusChangeEmail({
  to, recipientName, taskTitle, taskId, oldStatus, newStatus, changerName,
}: {
  to: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  oldStatus: string;
  newStatus: string;
  changerName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  if (!(await prefAllows(to, "statusChanges"))) return;
  const url = `${APP_URL}/tasks/${taskId}`;
  const statusLabels: Record<string, string> = {
    todo: "K provedení",
    in_progress: "Probíhá",
    done: "Hotovo",
    review: "Ke kontrole",
    cancelled: "Zrušeno",
  };
  const oldLabel = statusLabels[oldStatus] ?? oldStatus;
  const newLabel = statusLabels[newStatus] ?? newStatus;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Stav úkolu změněn: ${taskTitle}`,
      html: base(`
        <div class="header"><h1>Tymbr</h1></div>
        <div class="body">
          <p>Ahoj ${recipientName},</p>
          <p><strong>${changerName}</strong> změnil/a stav úkolu <strong>${taskTitle}</strong>:</p>
          <p style="margin:20px 0">
            <span style="background:#f3f4f6;padding:4px 10px;border-radius:6px;font-size:14px">${oldLabel}</span>
            <span style="margin:0 8px;color:#9ca3af">→</span>
            <span style="background:#fff3e0;color:#f7592f;padding:4px 10px;border-radius:6px;font-size:14px;font-weight:600">${newLabel}</span>
          </p>
          <a href="${url}" class="btn">Zobrazit úkol</a>
        </div>
        <div class="footer"><p>Tymbr · Nastavení notifikací lze změnit v nastavení účtu.</p></div>
      `),
    });
  } catch (err) {
    console.error("[email] sendStatusChangeEmail failed:", err);
  }
}

export async function sendWelcomeEmail({
  to, name, teamName,
}: {
  to: string;
  name: string;
  teamName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const url = `${APP_URL}/dashboard`;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Vítejte v Tymbr, ${name}!`,
      html: base(`
        <div class="header"><h1>Tymbr</h1></div>
        <div class="body">
          <p>Ahoj ${name},</p>
          <p>Váš účet byl úspěšně vytvořen a tým <strong>${teamName}</strong> je připraven k použití.</p>
          <p>Začněte tím, že si vytvoříte první úkol nebo pozvete kolegy do týmu.</p>
          <a href="${url}" class="btn">Přejít na přehled</a>
        </div>
        <div class="footer"><p>Tymbr · Firemní správa úkolů a výkazů.</p></div>
      `),
    });
  } catch (err) {
    console.error("[email] sendWelcomeEmail failed:", err);
  }
}

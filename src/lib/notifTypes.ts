export type NotifType =
  | "task_assigned"
  | "task_comment"
  | "task_status"
  | "task_due_soon"
  | "task_created_in_team"
  | "task_approval_requested"
  | "task_approved"
  | "task_rejected"
  | "event_assigned"
  | "mention"
  | "direct_message"
  | "chat_message"
  | "invitation"
  | "member_joined"
  | "content_assigned"
  | "vacation_requested"
  | "vacation_approved"
  | "vacation_rejected"
  | "invoice_overdue"
  | "invoice_paid"
  | "comment"        // legacy alias → task_comment
  | "status_change"; // legacy alias → task_status

export const DEFAULT_NOTIF_PREFS: Record<string, { inApp: boolean; push: boolean }> = {
  task_assigned:             { inApp: true,  push: true  },
  task_comment:              { inApp: true,  push: true  },
  task_status:               { inApp: true,  push: false },
  task_due_soon:             { inApp: true,  push: true  },
  task_created_in_team:      { inApp: false, push: false },
  task_approval_requested:   { inApp: true,  push: true  },
  task_approved:             { inApp: true,  push: true  },
  task_rejected:             { inApp: true,  push: true  },
  event_assigned:            { inApp: true,  push: true  },
  mention:                   { inApp: true,  push: true  },
  direct_message:            { inApp: true,  push: true  },
  chat_message:              { inApp: true,  push: true  },
  invitation:                { inApp: true,  push: true  },
  member_joined:             { inApp: false, push: false },
  content_assigned:          { inApp: true,  push: true  },
  vacation_requested:        { inApp: true,  push: true  },
  vacation_approved:         { inApp: true,  push: true  },
  vacation_rejected:         { inApp: true,  push: true  },
  invoice_overdue:           { inApp: true,  push: true  },
  invoice_paid:              { inApp: true,  push: true  },
};

export interface NotifTypeInfo {
  key: string;
  label: string;
  description: string;
  icon: string;
}

export interface NotifCategory {
  label: string;
  types: NotifTypeInfo[];
}

export const NOTIF_CATEGORIES: NotifCategory[] = [
  {
    label: "Úkoly",
    types: [
      { key: "task_assigned",           label: "Přiřazení k úkolu",   description: "Když tě někdo přiřadí k úkolu",             icon: "📋" },
      { key: "task_comment",            label: "Komentáře",            description: "Nový komentář u úkolu, na kterém pracuješ",  icon: "💬" },
      { key: "task_status",             label: "Změna statusu",        description: "Status tvého úkolu byl změněn",              icon: "🔄" },
      { key: "task_due_soon",           label: "Blížící se termín",    description: "Připomenutí 24 h před termínem úkolu",       icon: "⏰" },
      { key: "task_created_in_team",    label: "Nový úkol v týmu",    description: "Nový úkol byl přidán do týmu",               icon: "✨" },
      { key: "task_approval_requested", label: "Žádost o schválení",   description: "Úkol čeká na tvoje schválení",               icon: "✅" },
      { key: "task_approved",           label: "Úkol schválen",        description: "Tvůj úkol byl schválen",                     icon: "✅" },
      { key: "task_rejected",           label: "Úkol zamítnut",        description: "Tvůj úkol byl zamítnut",                     icon: "❌" },
    ],
  },
  {
    label: "Události",
    types: [
      { key: "event_assigned", label: "Přiřazení k události", description: "Byl/a jsi přidán/a k události v kalendáři", icon: "📅" },
    ],
  },
  {
    label: "Komunikace",
    types: [
      { key: "mention",        label: "Zmínění",       description: "Někdo tě zmínil v chatu nebo komentáři", icon: "🔔" },
      { key: "direct_message", label: "Přímé zprávy",  description: "Nová přímá zpráva od člena týmu",         icon: "✉️" },
      { key: "chat_message",   label: "Zprávy v chatu", description: "Nová zpráva v týmovém chatu",            icon: "💬" },
    ],
  },
  {
    label: "Tým",
    types: [
      { key: "invitation",    label: "Pozvánka do týmu", description: "Pozvání do nového týmu",             icon: "🤝" },
      { key: "member_joined", label: "Nový člen týmu",   description: "Nový člen se přidal do tvého týmu", icon: "👤" },
    ],
  },
  {
    label: "Obsah",
    types: [
      { key: "content_assigned", label: "Přiřazení obsahu", description: "Byl/a jsi přiřazen/a k obsahu v content plánu", icon: "📣" },
    ],
  },
  {
    label: "Fakturace",
    types: [
      { key: "invoice_overdue", label: "Faktura po splatnosti", description: "Vystavená faktura překročila splatnost", icon: "⏰" },
      { key: "invoice_paid",    label: "Faktura zaplacena",     description: "Platba byla automaticky spárována",       icon: "💰" },
    ],
  },
  {
    label: "Dovolená",
    types: [
      { key: "vacation_requested", label: "Žádost o dovolenou", description: "Člen týmu žádá o schválení dovolené", icon: "🏖️" },
      { key: "vacation_approved",  label: "Dovolená schválena",  description: "Tvoje dovolená byla schválena",         icon: "✅" },
      { key: "vacation_rejected",  label: "Dovolená zamítnuta",  description: "Tvoje dovolená byla zamítnuta",         icon: "❌" },
    ],
  },
];

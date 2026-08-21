export const NOTIFY_TEMPLATES = [
  {
    id: "confirm",
    label: "Confirmation",
    text: (name: string) =>
      `Dear ${name}, your appointment at BillVyapp is confirmed. We look forward to seeing you!`,
  },
  {
    id: "reminder",
    label: "Reminder",
    text: (name: string) =>
      `Hi ${name}, this is a friendly reminder about your upcoming appointment at BillVyapp. See you soon!`,
  },
  {
    id: "delay",
    label: "Running late",
    text: (name: string) =>
      `Hi ${name}, we're running slightly behind schedule at BillVyapp. Thank you for your patience — we'll see you shortly.`,
  },
  {
    id: "thanks",
    label: "Thank you",
    text: (name: string) =>
      `Thank you for visiting BillVyapp, ${name}! We hope you loved your experience. Book again anytime.`,
  },
] as const;

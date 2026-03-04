export type IcsEventInput = {
  uid: string;
  title: string;
  startIso: string;
  description?: string | null;
  url?: string | null;
  reminderMinutes?: number | null;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toUtcStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcsCalendar(events: IcsEventInput[], calendarName = "Wedly Pro Key Dates"): string {
  const nowStamp = toUtcStamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//Wedly Pro//Web App//EN",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  events.forEach((event) => {
    const startDate = new Date(event.startIso);
    if (!event.uid || !event.title || Number.isNaN(startDate.getTime())) return;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(event.uid)}`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${toUtcStamp(startDate)}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    if (event.url) {
      lines.push(`URL:${escapeIcsText(event.url)}`);
    }

    if (typeof event.reminderMinutes === "number" && Number.isFinite(event.reminderMinutes) && event.reminderMinutes >= 0) {
      lines.push("BEGIN:VALARM");
      lines.push(`TRIGGER:-PT${Math.max(0, Math.floor(event.reminderMinutes))}M`);
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeIcsText(event.title)}`);
      lines.push("END:VALARM");
    }

    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadIcsFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

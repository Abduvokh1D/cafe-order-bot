// Hozircha barcha kafelar O'zbekistonda
export const TIME_ZONE = "Asia/Tashkent";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Bugungi sana, YYYY-MM-DD. Faqat so'rov vaqtida chaqiriladi. */
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function isValidDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    DAY.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function shiftDay(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 2026-10-30 -> 30.10.2026 */
export function formatDay(day: string) {
  return day.split("-").reverse().join(".");
}

/** 31.10 11:28 */
export function formatDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  return `${parts.replace("/", ".")} ${formatTime(date)}`;
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

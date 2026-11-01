// Alohida fayl: brauzer ham ishlatadi, bazaga ulanadigan kod unga tushmasligi kerak

export type CafeHours = {
  /** Kafe buyurtma qabul qilishni qo'lda to'xtatishi mumkin */
  isAcceptingOrders: boolean;
  /** Kun boshidan daqiqalar. null: vaqt cheklovi yo'q */
  opensAtMinutes: number | null;
  closesAtMinutes: number | null;
};

export type CafeAvailability = { isOpen: true } | { isOpen: false; reason: "paused" | "off_hours" };

export function minutesInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return value("hour") * 60 + value("minute");
}

export function getCafeAvailability(hours: CafeHours, nowMinutes: number): CafeAvailability {
  if (!hours.isAcceptingOrders) return { isOpen: false, reason: "paused" };
  const { opensAtMinutes: opens, closesAtMinutes: closes } = hours;
  if (opens === null || closes === null) return { isOpen: true };
  // 18:00–02:00 kabi ish vaqti yarim tundan o'tadi
  const isWithin = opens < closes ? nowMinutes >= opens && nowMinutes < closes : nowMinutes >= opens || nowMinutes < closes;
  return isWithin ? { isOpen: true } : { isOpen: false, reason: "off_hours" };
}

/** 540 -> "09:00" */
export function formatMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

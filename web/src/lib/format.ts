/** 45000 -> "45 000 so'm". Intl ishlatilmaydi: server va brauzerda natija farq qilmasligi uchun. */
export function formatPrice(amount: number) {
  return `${String(amount).replace(/\B(?=(\d{3})+$)/g, " ")} so'm`;
}

/** 1 234 567 -> "1,2 mln", 12 000 -> "12 ming". Faqat o'q yozuvlari uchun, aniq qiymat jadvalda. */
export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${String(Math.round(value / 100_000) / 10).replace(".", ",")} mln`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} ming`;
  return String(value);
}

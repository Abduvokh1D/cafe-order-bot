/** 45000 -> "45 000 so'm". Intl ishlatilmaydi: server va brauzerda natija farq qilmasligi uchun. */
export function formatPrice(amount: number) {
  return `${String(amount).replace(/\B(?=(\d{3})+$)/g, " ")} so'm`;
}

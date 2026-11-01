import type { OrderType } from "./queries.ts";

// Alohida fayl: brauzer ham ishlatadi, bazaga ulanadigan kod unga tushmasligi kerak.
// Mijoz ekranda ko'rgan summa bilan server hisoblagani bir xil bo'lishi uchun qoida bitta joyda.

export type DeliveryPricing = {
  /** null: kafe narx kiritmagan, mijozga ko'rsatilmaydi. 0: yetkazish bepul */
  deliveryFee: number | null;
  /** Taomlar summasi shunga yetsa, yetkazish bepul */
  freeDeliveryFrom: number | null;
};

export function getDeliveryFee(type: OrderType, itemsTotal: number, pricing: DeliveryPricing) {
  if (type === "pickup" || !pricing.deliveryFee) return 0;
  const isFree = pricing.freeDeliveryFrom !== null && itemsTotal >= pricing.freeDeliveryFrom;
  return isFree ? 0 : pricing.deliveryFee;
}

export type PromoTerms = { type: "percent" | "fixed"; value: number; minOrderAmount: number };

/** Chegirma faqat taomlarga, yetkazish narxiga emas. Bepul yetkazish chegarasi chegirmagacha hisoblanadi. */
export function getPromoDiscount(terms: PromoTerms, itemsTotal: number) {
  if (itemsTotal < terms.minOrderAmount) return 0;
  return terms.type === "percent" ? Math.floor((itemsTotal * terms.value) / 100) : Math.min(terms.value, itemsTotal);
}

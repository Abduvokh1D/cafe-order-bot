import type { OrderStatus } from "@cafe/db";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "🆕 Yangi",
  accepted: "✅ Qabul qilindi",
  preparing: "👨‍🍳 Tayyorlanmoqda",
  ready: "🛍 Tayyor",
  on_the_way: "🚗 Yo'lda",
  delivered: "🎉 Yakunlandi",
  cancelled: "❌ Bekor qilindi",
};

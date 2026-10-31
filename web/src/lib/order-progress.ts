import type { CustomerOrder, OrderStatus, OrderType } from "@cafe/db";

// JSON orqali sana matn bo'lib keladi
export type LoadedOrder = Omit<CustomerOrder, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };

export type OrderStep = { status: OrderStatus; icon: string; title: string; hint: string };

const FIRST_STEPS: OrderStep[] = [
  { status: "new", icon: "🕐", title: "Buyurtma yuborildi", hint: "Kafe tasdiqlashini kutyapmiz" },
  { status: "accepted", icon: "✅", title: "Kafe qabul qildi", hint: "Tez orada tayyorlashni boshlaydi" },
  { status: "preparing", icon: "👨‍🍳", title: "Tayyorlanmoqda", hint: "Oshpaz buyurtmangiz ustida ishlayapti" },
];

// Tartib db/src/queries.ts dagi ORDER_FLOW bilan bir xil
const STEPS: Record<OrderType, OrderStep[]> = {
  delivery: [
    ...FIRST_STEPS,
    { status: "on_the_way", icon: "🛵", title: "Yo'lda", hint: "Kuryer sizga kelyapti" },
    { status: "delivered", icon: "🎉", title: "Yetkazildi", hint: "Yoqimli ishtaha!" },
  ],
  pickup: [
    ...FIRST_STEPS,
    { status: "ready", icon: "🛍", title: "Tayyor", hint: "Kelib olib ketishingiz mumkin" },
    { status: "delivered", icon: "🎉", title: "Topshirildi", hint: "Yoqimli ishtaha!" },
  ],
};

export const CANCELLED_STEP: OrderStep = {
  status: "cancelled",
  icon: "❌",
  title: "Bekor qilindi",
  hint: "Bu buyurtma bajarilmaydi",
};

export function getOrderSteps(type: OrderType) {
  return STEPS[type];
}

export function isActiveOrder(status: OrderStatus) {
  return status !== "delivered" && status !== "cancelled";
}

/** Joriy bosqich: bekor qilinganda alohida. */
export function getCurrentStep(order: Pick<LoadedOrder, "type" | "status">) {
  return STEPS[order.type].find((step) => step.status === order.status) ?? CANCELLED_STEP;
}

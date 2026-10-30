import type { OrderType, PlacedOrder } from "@cafe/db";
import { formatPrice } from "@/lib/format";

export type StaffMessageInput = {
  order: PlacedOrder;
  type: OrderType;
  customerName: string;
  username: string | null;
  phone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Oddiy matn sifatida yuboriladi (parse_mode yo'q): mijoz yozgan manzil formatlashni buza olmaydi
export function formatStaffMessage(input: StaffMessageInput) {
  const { order, type, customerName, username, phone, address, latitude, longitude } = input;
  return [
    `🆕 Yangi buyurtma №${order.orderId}`,
    type === "delivery" ? "🚗 Yetkazib berish" : "🏃 Olib ketish",
    "",
    `Mijoz: ${customerName}${username ? ` (@${username})` : ""}`,
    `Telefon: ${phone}`,
    ...(address ? [`Manzil: ${address}`] : []),
    ...(latitude !== null && longitude !== null
      ? [`Lokatsiya: https://maps.google.com/?q=${latitude},${longitude}`]
      : []),
    "",
    ...order.lines.map(
      (line) => `${line.name} × ${line.quantity} — ${formatPrice(line.unitPrice * line.quantity)}`,
    ),
    "",
    `Jami: ${formatPrice(order.totalAmount)}`,
  ].join("\n");
}

/** Xodimlar guruhiga xabar yuboradi va xabar raqamini qaytaradi. Xatoda istisno tashlaydi. */
export async function sendStaffMessage(botToken: string, chatId: number, orderId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Qabul qilish", callback_data: `order:accepted:${orderId}` },
            { text: "❌ Bekor qilish", callback_data: `order:cancel:${orderId}` },
          ],
        ],
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const body = (await response.json()) as {
    ok: boolean;
    description?: string;
    result?: { message_id: number };
  };
  if (!body.ok || !body.result) {
    // Faqat Telegram javobi yoziladi: so'rov manzilida maxfiy token bor
    throw new Error(`Telegram sendMessage xatosi: ${body.description ?? response.status}`);
  }
  return body.result.message_id;
}

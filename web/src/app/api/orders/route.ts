import { getCafeForOrder, placeOrder, type OrderType, type PaymentMethod } from "@cafe/db";
import { MAX_COMMENT_LENGTH, MAX_CUTLERY, MAX_QUANTITY } from "@/lib/cart-limits";
import { formatStaffMessage, sendStaffMessage } from "@/lib/staff-notify";
import { verifyInitData } from "@/lib/telegram-auth";

const MAX_LINES = 50;
const MAX_ADDRESS_LENGTH = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OrderRequest = {
  cafeSlug: string;
  initData: string;
  requestId: string;
  type: OrderType;
  paymentMethod: PaymentMethod;
  phone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  comment: string | null;
  cutleryCount: number;
  items: { productId: number; quantity: number }[];
  expectedTotal: number;
};

function fail(status: number, code: string) {
  return Response.json({ error: code }, { status });
}

function isCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

// Brauzerdan kelgan hech narsaga ishonilmaydi: tuzilma ham, chegaralar ham shu yerda tekshiriladi
function parseRequest(body: unknown): OrderRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const data = body as Record<string, unknown>;

  const { cafeSlug, initData, requestId, type, phone, items, expectedTotal } = data;
  if (typeof cafeSlug !== "string" || typeof initData !== "string") return null;
  if (typeof requestId !== "string" || !UUID.test(requestId)) return null;
  if (type !== "delivery" && type !== "pickup") return null;

  // Eski oynada qolgan Mini App bu maydonni yubormaydi: u naqd hisoblanadi
  const paymentMethod = data.paymentMethod ?? "cash";
  if (paymentMethod !== "cash" && paymentMethod !== "card") return null;

  const cleanPhone = typeof phone === "string" ? phone.trim() : "";
  const digits = cleanPhone.replace(/\D/g, "");
  if (!/^\+?[\d\s()-]+$/.test(cleanPhone) || digits.length < 9 || digits.length > 15) return null;

  const address = typeof data.address === "string" ? data.address.trim() : "";
  if (address.length > MAX_ADDRESS_LENGTH) return null;

  const hasLocation = data.latitude != null || data.longitude != null;
  if (hasLocation && !(isCoordinate(data.latitude, 90) && isCoordinate(data.longitude, 180))) {
    return null;
  }
  if (type === "delivery" && !address && !hasLocation) return null;

  const comment = typeof data.comment === "string" ? data.comment.trim() : "";
  if (comment.length > MAX_COMMENT_LENGTH) return null;

  const cutleryCount = data.cutleryCount ?? 0;
  if (!Number.isInteger(cutleryCount) || (cutleryCount as number) < 0 || (cutleryCount as number) > MAX_CUTLERY) {
    return null;
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) return null;
  const seen = new Set<number>();
  for (const item of items as { productId?: unknown; quantity?: unknown }[]) {
    if (!Number.isInteger(item?.productId) || !Number.isInteger(item?.quantity)) return null;
    const { productId, quantity } = item as { productId: number; quantity: number };
    if (quantity < 1 || quantity > MAX_QUANTITY || seen.has(productId)) return null;
    seen.add(productId);
  }

  if (!Number.isInteger(expectedTotal)) return null;

  return {
    cafeSlug,
    initData,
    requestId,
    type,
    paymentMethod,
    phone: cleanPhone,
    address: type === "delivery" && address ? address : null,
    latitude: type === "delivery" && hasLocation ? (data.latitude as number) : null,
    longitude: type === "delivery" && hasLocation ? (data.longitude as number) : null,
    comment: comment || null,
    cutleryCount: cutleryCount as number,
    items: items as OrderRequest["items"],
    expectedTotal: expectedTotal as number,
  };
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const input = parseRequest(body);
  if (!input) return fail(400, "invalid_request");

  const cafe = await getCafeForOrder(input.cafeSlug);
  if (!cafe) return fail(404, "cafe_not_found");
  if (!cafe.botToken || cafe.staffChatId === null) return fail(503, "cafe_not_ready");
  const { botToken, staffChatId } = cafe;

  const user = verifyInitData(input.initData, botToken);
  if (!user) return fail(401, "invalid_signature");

  const customerName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Mijoz";

  let staffNotified = false;
  try {
    const result = await placeOrder(
      {
        cafeId: cafe.id,
        requestId: input.requestId,
        customer: {
          telegramId: user.id,
          firstName: user.first_name ?? null,
          lastName: user.last_name ?? null,
          username: user.username ?? null,
        },
        type: input.type,
        paymentMethod: input.paymentMethod,
        phone: input.phone,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        comment: input.comment,
        cutleryCount: input.cutleryCount,
        items: input.items,
        expectedTotal: input.expectedTotal,
      },
      async (order) => {
        const text = formatStaffMessage({
          order,
          type: input.type,
          paymentMethod: input.paymentMethod,
          customerName,
          username: user.username ?? null,
          phone: input.phone,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          comment: input.comment,
          cutleryCount: input.cutleryCount,
        });
        const messageId = await sendStaffMessage(botToken, staffChatId, order.orderId, text);
        staffNotified = true;
        return messageId;
      },
    );

    if (result.status === "unavailable") {
      return Response.json({ error: "unavailable", productNames: result.productNames }, { status: 409 });
    }
    if (result.status === "price_changed") return fail(409, "price_changed");
    return Response.json({ orderId: result.orderId, totalAmount: result.totalAmount });
  } catch (error) {
    // Xabar ketib, saqlash xato bersa, xodimlar saqlanmagan buyurtmani ko'radi: buni logda ajratamiz
    console.error(
      staffNotified ? "Buyurtma xabari yuborildi, lekin saqlanmadi:" : "Buyurtma saqlanmadi:",
      error,
    );
    return fail(502, "order_failed");
  }
}

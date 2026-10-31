import { getCafeForOrder, getCustomerOrders } from "@cafe/db";
import { verifyInitData } from "@/lib/telegram-auth";

function fail(status: number, code: string) {
  return Response.json({ error: code }, { status });
}

// Mijoz faqat o'z buyurtmalarini ko'radi: kimligi brauzer aytganidan emas, Telegram imzosidan olinadi
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { cafeSlug?: unknown; initData?: unknown } | null;
  if (typeof body?.cafeSlug !== "string" || typeof body.initData !== "string") {
    return fail(400, "invalid_request");
  }

  const cafe = await getCafeForOrder(body.cafeSlug);
  if (!cafe) return fail(404, "cafe_not_found");
  if (!cafe.botToken) return fail(503, "cafe_not_ready");

  const user = verifyInitData(body.initData, cafe.botToken);
  if (!user) return fail(401, "invalid_signature");

  return Response.json({ orders: await getCustomerOrders(cafe.id, user.id) });
}

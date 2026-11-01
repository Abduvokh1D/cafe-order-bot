import { checkPromo, getCafeForOrder, getDb } from "@cafe/db";
import { TIME_ZONE } from "@/lib/day";
import { verifyInitData } from "@/lib/telegram-auth";

const MAX_CODE_LENGTH = 30;

function fail(status: number, code: string) {
  return Response.json({ error: code }, { status });
}

// Faqat tekshiradi: promokod haqiqatda buyurtma saqlanganda qo'llanadi va u yerda qayta tekshiriladi
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { cafeSlug?: unknown; initData?: unknown; code?: unknown } | null;
  if (typeof body?.cafeSlug !== "string" || typeof body.initData !== "string" || typeof body.code !== "string") {
    return fail(400, "invalid_request");
  }
  if (!body.code.trim() || body.code.length > MAX_CODE_LENGTH) return fail(404, "not_found");

  const cafe = await getCafeForOrder(body.cafeSlug);
  if (!cafe) return fail(404, "cafe_not_found");
  if (!cafe.botToken) return fail(503, "cafe_not_ready");

  // Kodlarni imzosiz sinab ko'rib bo'lmaydi; bir martalik cheklov ham mijozga bog'liq
  const user = verifyInitData(body.initData, cafe.botToken);
  if (!user) return fail(401, "invalid_signature");

  const promo = await checkPromo(getDb(), {
    cafeId: cafe.id,
    code: body.code,
    telegramId: user.id,
    timeZone: TIME_ZONE,
  });
  if (!promo.ok) return fail(409, promo.reason);
  return Response.json({ code: promo.code, terms: promo.terms });
}

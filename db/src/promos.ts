import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { getDb, type Db } from "./index.ts";
import type { PromoTerms } from "./pricing.ts";
import { customers, orders, promoCodes } from "./schema.ts";

// Kod katta-kichik harfga qaramaydi: mijoz "yoz20" yozsa ham ishlaydi
export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase();
}

export type PromoRejection = "not_found" | "expired" | "limit_reached" | "already_used";
export type PromoCheck = { ok: true; id: number; code: string; terms: PromoTerms } | { ok: false; reason: PromoRejection };

type Queryable = Pick<Db, "select">;

/**
 * Promokodni mijoz uchun tekshiradi. Foydalanish soni hisoblagichda emas, buyurtmalardan olinadi:
 * bekor qilingan buyurtma promokodni o'zi qaytaradi. forUpdate: bir vaqtdagi buyurtmalar limitdan oshmasligi uchun.
 */
export async function checkPromo(
  db: Queryable,
  input: { cafeId: number; code: string; telegramId: number; timeZone: string; forUpdate?: boolean },
): Promise<PromoCheck> {
  const base = db
    .select({
      id: promoCodes.id,
      code: promoCodes.code,
      type: promoCodes.type,
      value: promoCodes.value,
      minOrderAmount: promoCodes.minOrderAmount,
      maxUses: promoCodes.maxUses,
      isOncePerCustomer: promoCodes.isOncePerCustomer,
      isExpired: sql<boolean>`${promoCodes.expiresOn} < (now() at time zone ${input.timeZone})::date`,
    })
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.cafeId, input.cafeId),
        eq(promoCodes.code, normalizePromoCode(input.code)),
        eq(promoCodes.isActive, true),
        eq(promoCodes.isArchived, false),
      ),
    );
  const [promo] = await (input.forUpdate ? base.for("update") : base);
  if (!promo) return { ok: false, reason: "not_found" };
  if (promo.isExpired) return { ok: false, reason: "expired" };

  const activeUses = and(
    eq(orders.cafeId, input.cafeId),
    eq(orders.promoCodeId, promo.id),
    ne(orders.status, "cancelled"),
  );
  if (promo.maxUses !== null) {
    const [{ uses }] = await db.select({ uses: count() }).from(orders).where(activeUses);
    if (uses >= promo.maxUses) return { ok: false, reason: "limit_reached" };
  }
  if (promo.isOncePerCustomer) {
    const [{ uses }] = await db
      .select({ uses: count() })
      .from(orders)
      .innerJoin(customers, and(eq(customers.cafeId, orders.cafeId), eq(customers.id, orders.customerId)))
      .where(and(activeUses, eq(customers.telegramId, input.telegramId)));
    if (uses > 0) return { ok: false, reason: "already_used" };
  }

  return {
    ok: true,
    id: promo.id,
    code: promo.code,
    terms: { type: promo.type, value: promo.value, minOrderAmount: promo.minOrderAmount },
  };
}

export type AdminPromo = {
  id: number;
  code: string;
  type: PromoTerms["type"];
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  isOncePerCustomer: boolean;
  expiresOn: string | null;
  isActive: boolean;
  uses: number;
  discountTotal: number;
};

export async function getAdminPromos(cafeId: number): Promise<AdminPromo[]> {
  return getDb()
    .select({
      id: promoCodes.id,
      code: promoCodes.code,
      type: promoCodes.type,
      value: promoCodes.value,
      minOrderAmount: promoCodes.minOrderAmount,
      maxUses: promoCodes.maxUses,
      isOncePerCustomer: promoCodes.isOncePerCustomer,
      expiresOn: promoCodes.expiresOn,
      isActive: promoCodes.isActive,
      uses: sql<number>`count(${orders.id})::int`,
      discountTotal: sql<number>`coalesce(sum(${orders.discountAmount}), 0)::int`,
    })
    .from(promoCodes)
    .leftJoin(
      orders,
      and(eq(orders.cafeId, promoCodes.cafeId), eq(orders.promoCodeId, promoCodes.id), ne(orders.status, "cancelled")),
    )
    .where(and(eq(promoCodes.cafeId, cafeId), eq(promoCodes.isArchived, false)))
    .groupBy(promoCodes.id)
    .orderBy(desc(promoCodes.id));
}

export type PromoInput = {
  code: string;
  type: PromoTerms["type"];
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  isOncePerCustomer: boolean;
  expiresOn: string | null;
};

/** Faol kodlar orasida shu nom band bo'lsa, false qaytaradi. */
export async function createPromo(cafeId: number, input: PromoInput) {
  const db = getDb();
  const code = normalizePromoCode(input.code);
  const [taken] = await db
    .select({ id: promoCodes.id })
    .from(promoCodes)
    .where(and(eq(promoCodes.cafeId, cafeId), eq(promoCodes.code, code), eq(promoCodes.isArchived, false)));
  if (taken) return false;
  await db.insert(promoCodes).values({ ...input, cafeId, code });
  return true;
}

export async function setPromoActive(cafeId: number, promoId: number, isActive: boolean) {
  await getDb()
    .update(promoCodes)
    .set({ isActive })
    .where(and(eq(promoCodes.cafeId, cafeId), eq(promoCodes.id, promoId)));
}

/** O'chirilmaydi: eski buyurtmalarda ko'rsatilgan. Shu nomni keyin qayta ishlatish mumkin. */
export async function archivePromo(cafeId: number, promoId: number) {
  await getDb()
    .update(promoCodes)
    .set({ isArchived: true, isActive: false })
    .where(and(eq(promoCodes.cafeId, cafeId), eq(promoCodes.id, promoId)));
}

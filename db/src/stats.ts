import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "./index.ts";
import { orderItems, orders } from "./schema.ts";

export type CafeStats = {
  totals: {
    orders: number;
    cancelled: number;
    revenue: number;
    delivery: number;
    discount: number;
    cash: number;
    card: number;
    deliveryOrders: number;
    pickupOrders: number;
    customers: number;
  };
  byDay: { day: string; revenue: number; orders: number }[];
  byHour: { hour: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
};

/** Kun oralig'i (YYYY-MM-DD, ikkalasi ham kiradi, kafe vaqt zonasida). Bekor qilinganlar summaga kirmaydi. */
export async function getCafeStats(cafeId: number, fromDay: string, toDay: string, timeZone: string): Promise<CafeStats> {
  const db = getDb();
  const localTime = sql`(${orders.createdAt} at time zone ${timeZone})`;
  const inPeriod = and(eq(orders.cafeId, cafeId), sql`${localTime}::date between ${fromDay}::date and ${toDay}::date`);
  const notCancelled = and(inPeriod, ne(orders.status, "cancelled"));

  const [totals] = await db
    .select({
      orders: sql<number>`(count(*) filter (where ${orders.status} <> 'cancelled'))::int`,
      cancelled: sql<number>`(count(*) filter (where ${orders.status} = 'cancelled'))::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalAmount}) filter (where ${orders.status} <> 'cancelled'), 0)::int`,
      delivery: sql<number>`coalesce(sum(${orders.deliveryFee}) filter (where ${orders.status} <> 'cancelled'), 0)::int`,
      discount: sql<number>`coalesce(sum(${orders.discountAmount}) filter (where ${orders.status} <> 'cancelled'), 0)::int`,
      cash: sql<number>`coalesce(sum(${orders.totalAmount}) filter (where ${orders.status} <> 'cancelled' and ${orders.paymentMethod} = 'cash'), 0)::int`,
      card: sql<number>`coalesce(sum(${orders.totalAmount}) filter (where ${orders.status} <> 'cancelled' and ${orders.paymentMethod} = 'card'), 0)::int`,
      deliveryOrders: sql<number>`(count(*) filter (where ${orders.status} <> 'cancelled' and ${orders.type} = 'delivery'))::int`,
      pickupOrders: sql<number>`(count(*) filter (where ${orders.status} <> 'cancelled' and ${orders.type} = 'pickup'))::int`,
      customers: sql<number>`(count(distinct ${orders.customerId}) filter (where ${orders.status} <> 'cancelled'))::int`,
    })
    .from(orders)
    .where(inPeriod);

  const dayColumn = sql<string>`(${localTime}::date)::text`;
  const dayRows = await db
    .select({ day: dayColumn, revenue: sql<number>`sum(${orders.totalAmount})::int`, orders: sql<number>`count(*)::int` })
    .from(orders)
    .where(notCancelled)
    // Tartib raqami bilan: vaqt zonasi parametr bo'lgani uchun Postgres ifodalarni bir xil deb tanimaydi
    .groupBy(sql`1`);

  // Buyurtmasiz kunlar ham chizmada bo'sh joy bo'lib turadi: vaqt o'qi uzilmaydi
  const byDayMap = new Map(dayRows.map((row) => [row.day, row]));
  const byDay: CafeStats["byDay"] = [];
  for (let date = new Date(`${fromDay}T00:00:00Z`); date <= new Date(`${toDay}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
    const day = date.toISOString().slice(0, 10);
    byDay.push(byDayMap.get(day) ?? { day, revenue: 0, orders: 0 });
  }

  const hourColumn = sql<number>`extract(hour from ${localTime})::int`;
  const hourRows = await db
    .select({ hour: hourColumn, orders: sql<number>`count(*)::int` })
    .from(orders)
    .where(notCancelled)
    .groupBy(sql`1`);
  const byHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    orders: hourRows.find((row) => row.hour === hour)?.orders ?? 0,
  }));

  const quantity = sql<number>`sum(${orderItems.quantity})::int`;
  const topProducts = await db
    .select({
      name: orderItems.productName,
      quantity,
      revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, and(eq(orders.cafeId, orderItems.cafeId), eq(orders.id, orderItems.orderId)))
    .where(notCancelled)
    .groupBy(orderItems.productName)
    .orderBy(desc(quantity))
    .limit(8);

  return { totals, byDay, byHour, topProducts };
}

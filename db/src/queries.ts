import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./index.ts";
import {
  cafes,
  categories,
  customers,
  orderItems,
  orders,
  orderStatus,
  products,
} from "./schema.ts";

export type MenuProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
};

export type MenuCategory = {
  id: number;
  name: string;
  products: MenuProduct[];
};

export type CafeMenu = {
  cafe: { id: number; name: string; slug: string };
  categories: MenuCategory[];
};

/** Kafe menyusi; bunday kafe bo'lmasa null. Taomi yo'q kategoriyalar qaytarilmaydi. */
export async function getCafeMenu(slug: string): Promise<CafeMenu | null> {
  const db = getDb();

  const [cafe] = await db
    .select({ id: cafes.id, name: cafes.name, slug: cafes.slug })
    .from(cafes)
    .where(eq(cafes.slug, slug));
  if (!cafe) return null;

  const categoryRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.cafeId, cafe.id))
    .orderBy(asc(categories.sortOrder), asc(categories.id));

  const productRows = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      name: products.name,
      description: products.description,
      price: products.price,
      imageUrl: products.imageUrl,
      isAvailable: products.isAvailable,
    })
    .from(products)
    .where(eq(products.cafeId, cafe.id))
    .orderBy(asc(products.sortOrder), asc(products.id));

  return {
    cafe,
    categories: categoryRows
      .map((category) => ({
        ...category,
        products: productRows
          .filter((product) => product.categoryId === category.id)
          .map(({ categoryId: _categoryId, ...product }) => product),
      }))
      .filter((category) => category.products.length > 0),
  };
}

/** Faqat server uchun: natijada maxfiy bot tokeni bor, mijozga yuborilmaydi. */
export async function getCafeForOrder(slug: string) {
  const [cafe] = await getDb()
    .select({
      id: cafes.id,
      name: cafes.name,
      botToken: cafes.botToken,
      staffChatId: cafes.staffChatId,
    })
    .from(cafes)
    .where(eq(cafes.slug, slug));
  return cafe ?? null;
}

/** Bot ishga tushganda tokenini yozadi, Mini App imzosi shu bilan tekshiriladi. Kafe topilmasa false. */
export async function registerCafeBot(slug: string, botToken: string) {
  const rows = await getDb()
    .update(cafes)
    .set({ botToken })
    .where(eq(cafes.slug, slug))
    .returning({ id: cafes.id });
  return rows.length > 0;
}

export type OrderType = "delivery" | "pickup";

export type PlaceOrderInput = {
  cafeId: number;
  requestId: string;
  customer: {
    telegramId: number;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  };
  type: OrderType;
  phone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  items: { productId: number; quantity: number }[];
  /** Mijoz ekranda ko'rgan jami: narx o'zgargan bo'lsa, buyurtma qabul qilinmaydi */
  expectedTotal: number;
};

export type PlacedOrder = {
  orderId: number;
  totalAmount: number;
  lines: { name: string; unitPrice: number; quantity: number }[];
};

export type PlaceOrderResult =
  | { status: "created" | "duplicate"; orderId: number; totalAmount: number }
  | { status: "unavailable"; productNames: string[] }
  | { status: "price_changed" };

async function findOrderByRequest(cafeId: number, requestId: string) {
  const [order] = await getDb()
    .select({ orderId: orders.id, totalAmount: orders.totalAmount })
    .from(orders)
    .where(and(eq(orders.cafeId, cafeId), eq(orders.requestId, requestId)));
  return order ?? null;
}

function isRequestConflict(error: unknown) {
  const cause = (error as { cause?: { code?: string; constraint_name?: string } }).cause;
  return cause?.code === "23505" && cause.constraint_name === "orders_cafe_request_unique";
}

/**
 * Buyurtmani saqlaydi. Narx va jami faqat bazadan hisoblanadi.
 * notify xodimlarga xabar yuboradi va xabar raqamini qaytaradi; u xato bersa, buyurtma
 * bekor qilinadi: mijoz xatoni ko'radi, kafe esa bilmaydigan buyurtma qolmaydi.
 */
export async function placeOrder(
  input: PlaceOrderInput,
  notify: (order: PlacedOrder) => Promise<number>,
): Promise<PlaceOrderResult> {
  const db = getDb();
  const { cafeId, requestId, customer, items } = input;

  const existing = await findOrderByRequest(cafeId, requestId);
  if (existing) return { status: "duplicate", ...existing };

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      isAvailable: products.isAvailable,
    })
    .from(products)
    .where(
      and(
        eq(products.cafeId, cafeId),
        inArray(products.id, items.map((item) => item.productId)),
      ),
    );
  const byId = new Map(productRows.map((product) => [product.id, product]));

  const unavailable = items.filter((item) => !byId.get(item.productId)?.isAvailable);
  if (unavailable.length > 0) {
    return {
      status: "unavailable",
      productNames: unavailable.flatMap((item) => byId.get(item.productId)?.name ?? []),
    };
  }

  const lines = items.map((item) => {
    const product = byId.get(item.productId)!;
    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
    };
  });
  const totalAmount = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  if (totalAmount !== input.expectedTotal) return { status: "price_changed" };

  try {
    const orderId = await db.transaction(async (tx) => {
      const names = {
        firstName: customer.firstName,
        lastName: customer.lastName,
        username: customer.username,
        phone: input.phone,
      };
      const [{ customerId }] = await tx
        .insert(customers)
        .values({ cafeId, telegramId: customer.telegramId, ...names })
        .onConflictDoUpdate({
          target: [customers.cafeId, customers.telegramId],
          set: names,
        })
        .returning({ customerId: customers.id });

      const [{ id }] = await tx
        .insert(orders)
        .values({
          cafeId,
          customerId,
          requestId,
          type: input.type,
          phone: input.phone,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          totalAmount,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        lines.map((line) => ({
          cafeId,
          orderId: id,
          productId: line.productId,
          productName: line.name,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        })),
      );

      const staffMessageId = await notify({ orderId: id, totalAmount, lines });
      await tx.update(orders).set({ staffMessageId }).where(eq(orders.id, id));
      return id;
    });
    return { status: "created", orderId, totalAmount };
  } catch (error) {
    // Bir xil so'rov bir vaqtda ikki marta keldi: birinchisi saqlandi, uni qaytaramiz
    if (isRequestConflict(error)) {
      const order = await findOrderByRequest(cafeId, requestId);
      if (order) return { status: "duplicate", ...order };
    }
    throw error;
  }
}

export type OrderStatus = (typeof orderStatus.enumValues)[number];

const ORDER_FLOW: Record<OrderType, OrderStatus[]> = {
  delivery: ["new", "accepted", "preparing", "on_the_way", "delivered"],
  pickup: ["new", "accepted", "preparing", "ready", "delivered"],
};

/** Buyurtmaning keyingi holati; oxirgi holatda yoki bekor qilinganda null. */
export function nextOrderStatus(type: OrderType, status: OrderStatus): OrderStatus | null {
  const flow = ORDER_FLOW[type];
  const index = flow.indexOf(status);
  return index >= 0 ? (flow[index + 1] ?? null) : null;
}

export function canCancelOrder(status: OrderStatus) {
  return status !== "delivered" && status !== "cancelled";
}

export type StaffOrder = {
  id: number;
  type: OrderType;
  status: OrderStatus;
  customerTelegramId: number;
};

/** Buyurtmani faqat shu kafening xodimlar guruhi ko'ra oladi; boshqa holatda null. */
export async function getStaffOrder(input: {
  slug: string;
  chatId: number;
  orderId: number;
}): Promise<StaffOrder | null> {
  const [order] = await getDb()
    .select({
      id: orders.id,
      type: orders.type,
      status: orders.status,
      customerTelegramId: customers.telegramId,
    })
    .from(orders)
    .innerJoin(cafes, eq(cafes.id, orders.cafeId))
    .innerJoin(
      customers,
      and(eq(customers.cafeId, orders.cafeId), eq(customers.id, orders.customerId)),
    )
    .where(
      and(
        eq(cafes.slug, input.slug),
        eq(cafes.staffChatId, input.chatId),
        eq(orders.id, input.orderId),
      ),
    );
  return order ?? null;
}

export type AdvanceOrderResult =
  | { result: "ok"; order: StaffOrder; previousStatus: OrderStatus }
  | { result: "forbidden" }
  | { result: "stale"; order: StaffOrder };

/**
 * Buyurtmani keyingi holatga o'tkazadi yoki bekor qiladi. Holat faqat tartib bilan o'zgaradi;
 * ikki xodim bir vaqtda bossa, birinchisi hisoblanadi, ikkinchisi "stale" oladi.
 */
export async function advanceOrder(input: {
  slug: string;
  chatId: number;
  orderId: number;
  status: OrderStatus;
}): Promise<AdvanceOrderResult> {
  const order = await getStaffOrder(input);
  if (!order) return { result: "forbidden" };

  const isAllowed =
    input.status === "cancelled"
      ? canCancelOrder(order.status)
      : nextOrderStatus(order.type, order.status) === input.status;
  if (!isAllowed) return { result: "stale", order };

  const rows = await getDb()
    .update(orders)
    .set({ status: input.status })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning({ id: orders.id });
  if (rows.length === 0) {
    return { result: "stale", order: (await getStaffOrder(input)) ?? order };
  }

  return {
    result: "ok",
    order: { ...order, status: input.status },
    previousStatus: order.status,
  };
}

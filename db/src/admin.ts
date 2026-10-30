import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./index.ts";
import type { MenuProduct, OrderStatus, OrderType } from "./queries.ts";
import { categories, customers, orderItems, orders, products } from "./schema.ts";

// Har bir funksiya cafeId oladi va yozuvni shu bo'yicha tanlaydi: admin boshqa kafe
// yozuviga, hatto id'sini bilgan bo'lsa ham, tega olmaydi.

export type AdminCategory = {
  id: number;
  name: string;
  products: (MenuProduct & { categoryId: number })[];
};

export async function getAdminMenu(cafeId: number): Promise<AdminCategory[]> {
  const db = getDb();
  const categoryRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.cafeId, cafeId), eq(categories.isArchived, false)))
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
    .where(and(eq(products.cafeId, cafeId), eq(products.isArchived, false)))
    .orderBy(asc(products.sortOrder), asc(products.id));

  return categoryRows.map((category) => ({
    ...category,
    products: productRows.filter((product) => product.categoryId === category.id),
  }));
}

export async function createCategory(cafeId: number, name: string) {
  const db = getDb();
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${categories.sortOrder}) + 1, 0)::int` })
    .from(categories)
    .where(eq(categories.cafeId, cafeId));
  await db.insert(categories).values({ cafeId, name, sortOrder: next });
}

export async function renameCategory(cafeId: number, categoryId: number, name: string) {
  await getDb()
    .update(categories)
    .set({ name })
    .where(and(eq(categories.cafeId, cafeId), eq(categories.id, categoryId)));
}

/** Ichida taom qolgan kategoriya o'chirilmaydi: false qaytaradi. */
export async function archiveCategory(cafeId: number, categoryId: number) {
  const db = getDb();
  const active = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.cafeId, cafeId),
        eq(products.categoryId, categoryId),
        eq(products.isArchived, false),
      ),
    )
    .limit(1);
  if (active.length > 0) return false;

  await db
    .update(categories)
    .set({ isArchived: true })
    .where(and(eq(categories.cafeId, cafeId), eq(categories.id, categoryId)));
  return true;
}

export type ProductInput = {
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
};

async function isActiveCategory(cafeId: number, categoryId: number) {
  const [category] = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.cafeId, cafeId),
        eq(categories.id, categoryId),
        eq(categories.isArchived, false),
      ),
    );
  return Boolean(category);
}

/** Kategoriya shu kafega tegishli bo'lmasa, false qaytaradi. */
export async function createProduct(cafeId: number, input: ProductInput, imageUrl: string | null) {
  if (!(await isActiveCategory(cafeId, input.categoryId))) return false;
  const db = getDb();
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${products.sortOrder}) + 1, 0)::int` })
    .from(products)
    .where(and(eq(products.cafeId, cafeId), eq(products.categoryId, input.categoryId)));
  await db.insert(products).values({ cafeId, ...input, imageUrl, sortOrder: next });
  return true;
}

/**
 * Taomni yangilaydi. imageUrl undefined bo'lsa, rasm o'zgarmaydi.
 * Natijada eski rasm manzili qaytadi; taom yoki kategoriya topilmasa, null.
 */
export async function updateProduct(
  cafeId: number,
  productId: number,
  input: ProductInput,
  imageUrl: string | null | undefined,
) {
  if (!(await isActiveCategory(cafeId, input.categoryId))) return null;
  const db = getDb();
  const where = and(
    eq(products.cafeId, cafeId),
    eq(products.id, productId),
    eq(products.isArchived, false),
  );
  const [current] = await db.select({ imageUrl: products.imageUrl }).from(products).where(where);
  if (!current) return null;

  await db
    .update(products)
    .set({ ...input, ...(imageUrl === undefined ? {} : { imageUrl }) })
    .where(where);
  return { previousImageUrl: current.imageUrl };
}

export async function setProductAvailability(cafeId: number, productId: number, isAvailable: boolean) {
  await getDb()
    .update(products)
    .set({ isAvailable })
    .where(and(eq(products.cafeId, cafeId), eq(products.id, productId)));
}

export async function archiveProduct(cafeId: number, productId: number) {
  await getDb()
    .update(products)
    .set({ isArchived: true })
    .where(and(eq(products.cafeId, cafeId), eq(products.id, productId)));
}

export type AdminOrder = {
  id: number;
  status: OrderStatus;
  type: OrderType;
  phone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  totalAmount: number;
  createdAt: Date;
  customerName: string;
  username: string | null;
  items: { productName: string; unitPrice: number; quantity: number }[];
};

/** Kafening berilgan kundagi (YYYY-MM-DD, kafe vaqt zonasida) buyurtmalari, yangisi birinchi. */
export async function getOrdersForDay(
  cafeId: number,
  date: string,
  timeZone: string,
): Promise<AdminOrder[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      type: orders.type,
      phone: orders.phone,
      address: orders.address,
      latitude: orders.latitude,
      longitude: orders.longitude,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      firstName: customers.firstName,
      lastName: customers.lastName,
      username: customers.username,
    })
    .from(orders)
    .innerJoin(
      customers,
      and(eq(customers.cafeId, orders.cafeId), eq(customers.id, orders.customerId)),
    )
    .where(
      and(
        eq(orders.cafeId, cafeId),
        sql`(${orders.createdAt} at time zone ${timeZone})::date = ${date}::date`,
      ),
    )
    .orderBy(desc(orders.createdAt));
  if (rows.length === 0) return [];

  const itemRows = await db
    .select({
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(
      and(
        eq(orderItems.cafeId, cafeId),
        inArray(orderItems.orderId, rows.map((row) => row.id)),
      ),
    )
    .orderBy(asc(orderItems.id));

  return rows.map(({ firstName, lastName, ...order }) => ({
    ...order,
    customerName: [firstName, lastName].filter(Boolean).join(" ") || "Mijoz",
    items: itemRows
      .filter((item) => item.orderId === order.id)
      .map(({ orderId: _orderId, ...item }) => item),
  }));
}

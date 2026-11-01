import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "./index.ts";
import type { MenuProduct, OrderStatus, OrderType, PaymentMethod } from "./queries.ts";
import { banners, cafes, categories, customers, orderItems, orders, products } from "./schema.ts";

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
  paymentMethod: PaymentMethod;
  phone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  comment: string | null;
  cutleryCount: number;
  deliveryFee: number;
  promoCode: string | null;
  discountAmount: number;
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
      paymentMethod: orders.paymentMethod,
      phone: orders.phone,
      address: orders.address,
      latitude: orders.latitude,
      longitude: orders.longitude,
      comment: orders.comment,
      cutleryCount: orders.cutleryCount,
      deliveryFee: orders.deliveryFee,
      promoCode: orders.promoCode,
      discountAmount: orders.discountAmount,
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

export type AdminBanner = { id: number; imageUrl: string; isActive: boolean };

export async function getAdminSettings(cafeId: number) {
  const db = getDb();
  const [cafe] = await db
    .select({
      deliveryMinMinutes: cafes.deliveryMinMinutes,
      deliveryMaxMinutes: cafes.deliveryMaxMinutes,
      deliveryFee: cafes.deliveryFee,
      freeDeliveryFrom: cafes.freeDeliveryFrom,
      phone: cafes.phone,
      address: cafes.address,
      isAcceptingOrders: cafes.isAcceptingOrders,
      opensAtMinutes: cafes.opensAtMinutes,
      closesAtMinutes: cafes.closesAtMinutes,
    })
    .from(cafes)
    .where(eq(cafes.id, cafeId));
  const bannerRows: AdminBanner[] = await db
    .select({ id: banners.id, imageUrl: banners.imageUrl, isActive: banners.isActive })
    .from(banners)
    .where(eq(banners.cafeId, cafeId))
    .orderBy(desc(banners.id));
  return { ...cafe, banners: bannerRows };
}

export async function setDeliveryTime(cafeId: number, minMinutes: number | null, maxMinutes: number | null) {
  await getDb()
    .update(cafes)
    .set({ deliveryMinMinutes: minMinutes, deliveryMaxMinutes: maxMinutes })
    .where(eq(cafes.id, cafeId));
}

export async function setDeliveryPrice(cafeId: number, deliveryFee: number | null, freeDeliveryFrom: number | null) {
  await getDb().update(cafes).set({ deliveryFee, freeDeliveryFrom }).where(eq(cafes.id, cafeId));
}

export async function createBanner(cafeId: number, imageUrl: string) {
  await getDb().insert(banners).values({ cafeId, imageUrl });
}

export async function setBannerActive(cafeId: number, bannerId: number, isActive: boolean) {
  await getDb()
    .update(banners)
    .set({ isActive })
    .where(and(eq(banners.cafeId, cafeId), eq(banners.id, bannerId)));
}

/** Banner buyurtmalarga bog'lanmagan, shuning uchun butunlay o'chiriladi. Rasm manzilini qaytaradi. */
export async function deleteBanner(cafeId: number, bannerId: number) {
  const [deleted] = await getDb()
    .delete(banners)
    .where(and(eq(banners.cafeId, cafeId), eq(banners.id, bannerId)))
    .returning({ imageUrl: banners.imageUrl });
  return deleted?.imageUrl ?? null;
}

export async function setCafeContacts(cafeId: number, phone: string | null, address: string | null) {
  await getDb().update(cafes).set({ phone, address }).where(eq(cafes.id, cafeId));
}

export async function setCafeHours(cafeId: number, opensAtMinutes: number | null, closesAtMinutes: number | null) {
  await getDb().update(cafes).set({ opensAtMinutes, closesAtMinutes }).where(eq(cafes.id, cafeId));
}

export async function setCafeAccepting(cafeId: number, isAcceptingOrders: boolean) {
  await getDb().update(cafes).set({ isAcceptingOrders }).where(eq(cafes.id, cafeId));
}

export async function getCafeAccepting(cafeId: number) {
  const [cafe] = await getDb()
    .select({
      isAcceptingOrders: cafes.isAcceptingOrders,
      opensAtMinutes: cafes.opensAtMinutes,
      closesAtMinutes: cafes.closesAtMinutes,
    })
    .from(cafes)
    .where(eq(cafes.id, cafeId));
  return cafe;
}

export type MoveDirection = "up" | "down";

// Ro'yxat qayta raqamlanadi: eski yozuvlarda sortOrder bir xil bo'lishi mumkin
function swapped(ids: number[], id: number, direction: MoveDirection) {
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export async function moveCategory(cafeId: number, categoryId: number, direction: MoveDirection) {
  await getDb().transaction(async (tx) => {
    const rows = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.cafeId, cafeId), eq(categories.isArchived, false)))
      .orderBy(asc(categories.sortOrder), asc(categories.id));
    const next = swapped(rows.map((row) => row.id), categoryId, direction);
    if (!next) return;
    for (const [sortOrder, id] of next.entries()) {
      await tx.update(categories).set({ sortOrder }).where(and(eq(categories.cafeId, cafeId), eq(categories.id, id)));
    }
  });
}

export async function moveProduct(cafeId: number, productId: number, direction: MoveDirection) {
  await getDb().transaction(async (tx) => {
    const [product] = await tx
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(and(eq(products.cafeId, cafeId), eq(products.id, productId)));
    if (!product) return;
    const rows = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.cafeId, cafeId),
          eq(products.categoryId, product.categoryId),
          eq(products.isArchived, false),
        ),
      )
      .orderBy(asc(products.sortOrder), asc(products.id));
    const next = swapped(rows.map((row) => row.id), productId, direction);
    if (!next) return;
    for (const [sortOrder, id] of next.entries()) {
      await tx.update(products).set({ sortOrder }).where(and(eq(products.cafeId, cafeId), eq(products.id, id)));
    }
  });
}

export type AdminCustomer = {
  id: number;
  name: string;
  username: string | null;
  phone: string | null;
  orders: number;
  spent: number;
  lastOrderAt: Date | null;
};

const CUSTOMERS_PAGE_SIZE = 50;

function customerName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Mijoz";
}

function customerRows(where: SQL | undefined) {
  return getDb()
    .select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      username: customers.username,
      phone: customers.phone,
      orders: sql<number>`count(${orders.id})::int`,
      spent: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::int`,
      lastOrderAt: sql<string | null>`max(${orders.createdAt})`,
    })
    .from(customers)
    .leftJoin(
      orders,
      and(eq(orders.cafeId, customers.cafeId), eq(orders.customerId, customers.id), ne(orders.status, "cancelled")),
    )
    .where(where)
    .groupBy(customers.id);
}

type CustomerRow = Awaited<ReturnType<typeof customerRows>>[number];

function toAdminCustomer({ firstName, lastName, lastOrderAt, ...row }: CustomerRow): AdminCustomer {
  return {
    ...row,
    name: customerName(firstName, lastName),
    lastOrderAt: lastOrderAt ? new Date(lastOrderAt) : null,
  };
}

/** Xarid summasiga bekor qilingan buyurtmalar kirmaydi. */
export async function listCustomers(
  cafeId: number,
  options: { query: string; sort: "recent" | "spent"; page: number },
) {
  const search = options.query.trim().replace(/[\\%_]/g, "\\$&");
  const pattern = `%${search}%`;
  const rows = await customerRows(
    and(
      eq(customers.cafeId, cafeId),
      search
        ? or(
            ilike(customers.firstName, pattern),
            ilike(customers.lastName, pattern),
            ilike(customers.username, pattern),
            ilike(customers.phone, pattern),
          )
        : undefined,
    ),
  )
    .orderBy(
      options.sort === "spent" ? sql`coalesce(sum(${orders.totalAmount}), 0) desc` : sql`max(${orders.createdAt}) desc nulls last`,
      desc(customers.id),
    )
    .limit(CUSTOMERS_PAGE_SIZE + 1)
    .offset((options.page - 1) * CUSTOMERS_PAGE_SIZE);
  return { customers: rows.slice(0, CUSTOMERS_PAGE_SIZE).map(toAdminCustomer), hasMore: rows.length > CUSTOMERS_PAGE_SIZE };
}

export async function getCustomerDetail(cafeId: number, customerId: number) {
  const [row] = await customerRows(and(eq(customers.cafeId, cafeId), eq(customers.id, customerId)));
  if (!row) return null;

  const orderRows = await getDb()
    .select({
      id: orders.id,
      status: orders.status,
      type: orders.type,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.cafeId, cafeId), eq(orders.customerId, customerId)))
    .orderBy(desc(orders.id))
    .limit(100);
  const itemRows = orderRows.length
    ? await getDb()
        .select({ orderId: orderItems.orderId, productName: orderItems.productName, quantity: orderItems.quantity })
        .from(orderItems)
        .where(and(eq(orderItems.cafeId, cafeId), inArray(orderItems.orderId, orderRows.map((order) => order.id))))
        .orderBy(asc(orderItems.id))
    : [];

  return {
    customer: toAdminCustomer(row),
    orders: orderRows.map((order) => ({
      ...order,
      items: itemRows.filter((item) => item.orderId === order.id),
    })),
  };
}

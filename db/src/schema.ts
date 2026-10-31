import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Narxlar so'mda, butun son sifatida saqlanadi (o'nli kasr xatolari bo'lmasligi uchun).
//
// Kafelar bir-biridan ajratilgan: har bir jadvalda cafe_id bor va bog'lanishlar
// (cafe_id, id) juftligi orqali tekshiriladi, shuning uchun bir kafening yozuvi
// boshqa kafening yozuviga baza darajasida bog'lana olmaydi.

const id = () => integer("id").primaryKey().generatedAlwaysAsIdentity();
const cafeId = () =>
  integer("cafe_id")
    .notNull()
    .references(() => cafes.id, { onDelete: "restrict" });
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const orderStatus = pgEnum("order_status", [
  "new",
  "accepted",
  "preparing",
  // Olib ketish uchun: mijoz kelib olishi mumkin (yetkazib berishda "on_the_way" ishlatiladi)
  "ready",
  "on_the_way",
  "delivered",
  "cancelled",
]);

export const orderType = pgEnum("order_type", ["delivery", "pickup"]);

// Mijoz buyurtmani olganda to'laydi: naqd yoki karta bilan. Onlayn to'lov hali yo'q
export const paymentMethod = pgEnum("payment_method", ["cash", "card"]);

export const cafes = pgTable(
  "cafes",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    // Bot ishga tushganda o'zi yozadi. Maxfiy: mijozga yuboriladigan so'rovlarda tanlanmaydi
    botToken: text("bot_token"),
    // Buyurtmalar keladigan xodimlar guruhi (Telegram chat id)
    staffChatId: bigint("staff_chat_id", { mode: "number" }),
    // Menyuda ko'rsatiladigan taxminiy vaqt; kiritilmagan bo'lsa, ko'rsatilmaydi
    deliveryMinMinutes: integer("delivery_min_minutes"),
    deliveryMaxMinutes: integer("delivery_max_minutes"),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "cafes_delivery_time_check",
      sql`(${t.deliveryMinMinutes} IS NULL AND ${t.deliveryMaxMinutes} IS NULL) OR (${t.deliveryMinMinutes} > 0 AND ${t.deliveryMaxMinutes} >= ${t.deliveryMinMinutes})`,
    ),
  ],
);

export const admins = pgTable("admins", {
  id: id(),
  cafeId: cafeId(),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: createdAt(),
});

export const adminSessions = pgTable("admin_sessions", {
  // Cookie'dagi tokenning o'zi emas, xeshi saqlanadi: baza oshkor bo'lsa ham kirib bo'lmaydi
  tokenHash: text("token_hash").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

// Chegirma va aksiya rasmlari: menyuda faqat yoqilganlari ko'rinadi
export const banners = pgTable(
  "banners",
  {
    id: id(),
    cafeId: cafeId(),
    imageUrl: text("image_url").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("banners_cafe_idx").on(t.cafeId)],
);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    cafeId: cafeId(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    // O'chirish o'rniga: eski buyurtmalar bog'langan yozuvlar saqlanib qoladi
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [unique("categories_cafe_id_id_unique").on(t.cafeId, t.id)],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    cafeId: cafeId(),
    categoryId: integer("category_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    imageUrl: text("image_url"),
    // false bo'lsa — "tugadi", menyuda sotib bo'lmaydi
    isAvailable: boolean("is_available").notNull().default(true),
    // O'chirish o'rniga: buyurtmalar tarixidagi taom yo'qolmaydi
    isArchived: boolean("is_archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    unique("products_cafe_id_id_unique").on(t.cafeId, t.id),
    foreignKey({
      name: "products_category_fk",
      columns: [t.cafeId, t.categoryId],
      foreignColumns: [categories.cafeId, categories.id],
    }).onDelete("restrict"),
    check("products_price_check", sql`${t.price} >= 0`),
    index("products_cafe_category_idx").on(t.cafeId, t.categoryId),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: id(),
    cafeId: cafeId(),
    telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    username: text("username"),
    phone: text("phone"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("customers_cafe_id_id_unique").on(t.cafeId, t.id),
    // Bitta odam har bir kafe uchun alohida mijoz hisoblanadi
    unique("customers_cafe_telegram_unique").on(t.cafeId, t.telegramId),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    cafeId: cafeId(),
    customerId: integer("customer_id").notNull(),
    // Mini App har bir urinish uchun yaratadi: internet uzilib qayta yuborilsa, buyurtma ikkilanmaydi
    requestId: uuid("request_id").notNull(),
    // Xodimlar guruhidagi xabar raqami
    staffMessageId: integer("staff_message_id"),
    status: orderStatus("status").notNull().default("new"),
    type: orderType("type").notNull(),
    paymentMethod: paymentMethod("payment_method").notNull().default("cash"),
    phone: text("phone").notNull(),
    address: text("address"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    // Mijoz izohi va nechta vilka-qoshiq kerakligi: faqat xodimlarga ko'rsatiladi
    comment: text("comment"),
    cutleryCount: integer("cutlery_count").notNull().default(0),
    totalAmount: integer("total_amount").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("orders_cafe_id_id_unique").on(t.cafeId, t.id),
    unique("orders_cafe_request_unique").on(t.cafeId, t.requestId),
    foreignKey({
      name: "orders_customer_fk",
      columns: [t.cafeId, t.customerId],
      foreignColumns: [customers.cafeId, customers.id],
    }).onDelete("restrict"),
    check("orders_total_amount_check", sql`${t.totalAmount} >= 0`),
    check("orders_cutlery_count_check", sql`${t.cutleryCount} >= 0`),
    // Yetkazib berishda manzil yoki lokatsiya bo'lishi shart
    check(
      "orders_delivery_location_check",
      sql`${t.type} = 'pickup' OR ${t.address} IS NOT NULL OR (${t.latitude} IS NOT NULL AND ${t.longitude} IS NOT NULL)`,
    ),
    index("orders_cafe_created_idx").on(t.cafeId, t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    cafeId: cafeId(),
    orderId: integer("order_id").notNull(),
    productId: integer("product_id").notNull(),
    // Buyurtma paytidagi nom va narx: taom keyin o'zgarsa ham eski buyurtma o'zgarmaydi
    productName: text("product_name").notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [
    foreignKey({
      name: "order_items_order_fk",
      columns: [t.cafeId, t.orderId],
      foreignColumns: [orders.cafeId, orders.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "order_items_product_fk",
      columns: [t.cafeId, t.productId],
      foreignColumns: [products.cafeId, products.id],
    }).onDelete("restrict"),
    check("order_items_unit_price_check", sql`${t.unitPrice} >= 0`),
    check("order_items_quantity_check", sql`${t.quantity} > 0`),
    index("order_items_order_idx").on(t.cafeId, t.orderId),
  ],
);

import { createInterface } from "node:readline/promises";
import { eq } from "drizzle-orm";
import { getDb } from "./index.ts";
import { cafes } from "./schema.ts";

try {
  process.loadEnvFile("../.env");
} catch {
  // .env fayli yo'q — o'zgaruvchilar tizim muhitidan olinadi (masalan, serverda)
}

// Bu manzillarni sayt o'zi ishlatadi: shunday nomli kafe menyusi ochilmas edi
const RESERVED_SLUGS = new Set(["admin", "api", "uploads"]);
const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const name = process.env.CAFE_NAME ?? (await prompt.question("Kafe nomi (masalan, Bahor kafe): ")).trim();
const slug = process.env.NEW_CAFE_SLUG ?? (await prompt.question("Manzildagi nomi (masalan, bahor-kafe): ")).trim();
prompt.close();

if (!name) {
  console.error("Kafe nomi bo'sh bo'lmasligi kerak.");
  process.exit(1);
}
if (!SLUG_FORMAT.test(slug) || RESERVED_SLUGS.has(slug)) {
  console.error(`"${slug}" ishlatib bo'lmaydi: faqat kichik lotin harflari, raqam va chiziqcha; admin, api, uploads band.`);
  process.exit(1);
}

const db = getDb();
const [existing] = await db.select({ id: cafes.id }).from(cafes).where(eq(cafes.slug, slug));
if (existing) {
  console.error(`"${slug}" allaqachon bor.`);
  process.exitCode = 1;
} else {
  await db.insert(cafes).values({ name, slug });
  console.log(`"${name}" yaratildi. Menyu manzili: /${slug}`);
}
await db.$client.end();

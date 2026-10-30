import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export { schema };
export * from "./queries.ts";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL topilmadi. Ildiz papkada .env faylini .env.example asosida yarating.");
  }
  return drizzle(postgres(url), { schema });
}

export type Db = ReturnType<typeof createDb>;

// Next.js ishlab chiqishda modullarni qayta yuklaydi: ulanish qayta-qayta ochilmasligi uchun globalThis'da saqlanadi
const store = globalThis as unknown as { cafeDb?: Db };

export function getDb(): Db {
  store.cafeDb ??= createDb();
  return store.cafeDb;
}

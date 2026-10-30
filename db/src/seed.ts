import { eq } from "drizzle-orm";
import { getDb } from "./index.ts";
import { cafes, categories, products } from "./schema.ts";

try {
  process.loadEnvFile("../.env");
} catch {
  // .env fayli yo'q — o'zgaruvchilar tizim muhitidan olinadi (masalan, serverda)
}

const SLUG = "sinov-kafe";

const menu = [
  {
    category: "Milliy taomlar",
    items: [
      { name: "Palov", description: "Mol go'shti, sabzi, guruch", price: 45000 },
      { name: "Lag'mon", description: "Qo'lda cho'zilgan xamir, go'sht, sabzavot", price: 38000 },
      { name: "Manti", description: "4 dona, bug'da pishirilgan", price: 32000 },
    ],
  },
  {
    category: "Salatlar",
    items: [
      { name: "Achichuk", description: "Pomidor, piyoz, achchiq qalampir", price: 15000 },
      { name: "Sezar", description: "Tovuq, salat bargi, parmezan", price: 35000 },
    ],
  },
  {
    category: "Ichimliklar",
    items: [
      { name: "Choy", description: "Ko'k yoki qora, choynakda", price: 8000 },
      { name: "Kompot", description: "Uy kompoti, 0,5 l", price: 12000 },
    ],
  },
];

const db = getDb();

const [existing] = await db.select({ id: cafes.id }).from(cafes).where(eq(cafes.slug, SLUG));

if (existing) {
  console.log(`"${SLUG}" allaqachon bor, hech narsa o'zgarmadi.`);
} else {
  await db.transaction(async (tx) => {
    const [cafe] = await tx.insert(cafes).values({ name: "Sinov kafe", slug: SLUG }).returning();

    for (const [categoryIndex, group] of menu.entries()) {
      const [category] = await tx
        .insert(categories)
        .values({ cafeId: cafe.id, name: group.category, sortOrder: categoryIndex })
        .returning();

      await tx.insert(products).values(
        group.items.map((item, itemIndex) => ({
          ...item,
          cafeId: cafe.id,
          categoryId: category.id,
          sortOrder: itemIndex,
        })),
      );
    }
  });

  const count = menu.reduce((sum, group) => sum + group.items.length, 0);
  console.log(`"${SLUG}" yaratildi: ${menu.length} ta kategoriya, ${count} ta taom.`);
}

await db.$client.end();

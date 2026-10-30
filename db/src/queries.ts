import { asc, eq } from "drizzle-orm";
import { getDb } from "./index.ts";
import { cafes, categories, products } from "./schema.ts";

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

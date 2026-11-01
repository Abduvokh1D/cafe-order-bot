import { getAdminMenu, type AdminCategory, type MenuProduct } from "@cafe/db";
import Image from "next/image";
import { Suspense } from "react";
import {
  archiveCategoryAction,
  archiveProductAction,
  createCategoryAction,
  createProductAction,
  moveCategoryAction,
  moveProductAction,
  renameCategoryAction,
  setAvailabilityAction,
  updateProductAction,
} from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { ProductImageInput } from "@/components/admin/product-image-input";
import { requireAdmin } from "@/lib/admin-session";
import type { FormState } from "@/lib/form-state";
import { formatPrice } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";

const inputClass = "w-full rounded-xl bg-secondary px-3 py-2 text-base font-normal outline-none";
const primaryButton = "rounded-xl bg-button px-4 py-2 text-sm font-medium text-button-text disabled:opacity-50";
const secondaryButton = "rounded-xl bg-secondary px-3 py-2 text-sm font-medium disabled:opacity-50";

export default function MenuPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-hint">Yuklanmoqda...</p>}>
      <MenuEditor />
    </Suspense>
  );
}

async function MenuEditor() {
  const admin = await requireAdmin();
  const categories = await getAdminMenu(admin.cafeId);
  // Xodim faqat "tugadi" belgisini o'zgartiradi, amallarning o'zi ham serverda tekshiriladi
  const canEdit = hasPermission(admin.role, "menu");

  return (
    <>
      <h1 className="text-lg font-semibold">Menyu</h1>

      {categories.map((category, index) => (
        <CategorySection
          key={category.id}
          category={category}
          categories={categories}
          canEdit={canEdit}
          isFirst={index === 0}
          isLast={index === categories.length - 1}
        />
      ))}

      {canEdit && <section className="rounded-2xl bg-section p-4">
        <h2 className="pb-2 font-semibold">Yangi kategoriya</h2>
        <AdminForm action={createCategoryAction} resetOnSuccess className="flex flex-wrap gap-2">
          <input
            name="name"
            required
            maxLength={120}
            aria-label="Kategoriya nomi"
            placeholder="Masalan: Shirinliklar"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button type="submit" className={primaryButton}>
            Qo&apos;shish
          </button>
        </AdminForm>
      </section>}
    </>
  );
}

function MoveButtons({
  id,
  name,
  action,
  isFirst,
  isLast,
}: {
  id: number;
  name: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  isFirst: boolean;
  isLast: boolean;
}) {
  const buttonClass = "flex size-9 items-center justify-center rounded-lg bg-secondary text-sm font-medium disabled:opacity-30";
  return (
    <div className="flex shrink-0 gap-1">
      <AdminForm action={action} className="flex flex-col">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        <button type="submit" disabled={isFirst} aria-label={`${name}ni yuqoriga`} className={buttonClass}>
          ↑
        </button>
      </AdminForm>
      <AdminForm action={action} className="flex flex-col">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        <button type="submit" disabled={isLast} aria-label={`${name}ni pastga`} className={buttonClass}>
          ↓
        </button>
      </AdminForm>
    </div>
  );
}

function CategorySection({
  category,
  categories,
  canEdit,
  isFirst,
  isLast,
}: {
  category: AdminCategory;
  categories: AdminCategory[];
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <section aria-label={category.name} className="flex flex-col gap-3 rounded-2xl bg-section p-4">
      {!canEdit && <h2 className="font-semibold">{category.name}</h2>}
      {canEdit && <div className="flex flex-wrap items-center gap-2">
        <AdminForm action={renameCategoryAction} showSaved className="flex w-full flex-wrap gap-2">
          <input type="hidden" name="id" value={category.id} />
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={category.name}
            aria-label="Kategoriya nomi"
            className={`${inputClass} min-w-0 flex-1 font-semibold`}
          />
          <button type="submit" className={secondaryButton}>
            Saqlash
          </button>
        </AdminForm>
        <MoveButtons id={category.id} name={category.name} action={moveCategoryAction} isFirst={isFirst} isLast={isLast} />
        <AdminForm
          action={archiveCategoryAction}
          confirmMessage={`"${category.name}" kategoriyasi o'chirilsinmi?`}
          className="ml-auto flex flex-wrap justify-end gap-2"
        >
          <input type="hidden" name="id" value={category.id} />
          <button type="submit" className={`${secondaryButton} text-destructive`}>
            O&apos;chirish
          </button>
        </AdminForm>
      </div>}

      {category.products.length === 0 ? (
        <p className="text-sm text-hint">Bu kategoriyada taom yo&apos;q.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-secondary">
          {category.products.map((product, index) => (
            <li key={product.id} className="py-3 first:pt-0">
              <ProductRow
                product={product}
                categoryId={category.id}
                categories={categories}
                canEdit={canEdit}
                isFirst={index === 0}
                isLast={index === category.products.length - 1}
              />
            </li>
          ))}
        </ul>
      )}

      {canEdit && <details className="rounded-xl border border-secondary p-3">
        <summary className="cursor-pointer text-sm font-medium">+ Taom qo&apos;shish</summary>
        <AdminForm action={createProductAction} resetOnSuccess showSaved className="flex flex-col gap-3 pt-3">
          <ProductFields categoryId={category.id} categories={categories} />
          <button type="submit" className={`${primaryButton} self-start`}>
            Qo&apos;shish
          </button>
        </AdminForm>
      </details>}
    </section>
  );
}

function ProductRow({
  product,
  categoryId,
  categories,
  canEdit,
  isFirst,
  isLast,
}: {
  product: MenuProduct;
  categoryId: number;
  categories: AdminCategory[];
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-xl">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt=""
              fill
              unoptimized
              sizes="56px"
              className={`object-cover ${product.isAvailable ? "" : "grayscale"}`}
            />
          ) : (
            <span aria-hidden>🍽</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{product.name}</span>
          <span className="text-sm text-hint">{formatPrice(product.price)}</span>
        </div>
        <AdminForm action={setAvailabilityAction} className="flex shrink-0 flex-col items-end gap-1">
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="isAvailable" value={String(!product.isAvailable)} />
          <button
            type="submit"
            className={product.isAvailable ? secondaryButton : `${secondaryButton} text-destructive`}
            aria-label={`${product.name}: ${product.isAvailable ? "tugadi deb belgilash" : "mavjud deb belgilash"}`}
          >
            {product.isAvailable ? "Mavjud" : "Tugadi"}
          </button>
        </AdminForm>
        {canEdit && <MoveButtons id={product.id} name={product.name} action={moveProductAction} isFirst={isFirst} isLast={isLast} />}
      </div>

      {canEdit && <details>
        <summary className="cursor-pointer text-sm text-hint">Tahrirlash</summary>
        <AdminForm action={updateProductAction} resetOnSuccess showSaved className="flex flex-col gap-3 pt-3">
          <input type="hidden" name="id" value={product.id} />
          <ProductFields product={product} categoryId={categoryId} categories={categories} />
          <button type="submit" className={`${primaryButton} self-start`}>
            Saqlash
          </button>
        </AdminForm>
        <AdminForm
          action={archiveProductAction}
          confirmMessage={`"${product.name}" menyudan o'chirilsinmi? Eski buyurtmalarda u saqlanib qoladi.`}
          className="flex flex-col gap-1 pt-2"
        >
          <input type="hidden" name="id" value={product.id} />
          <button type="submit" className={`${secondaryButton} self-start text-destructive`}>
            Menyudan o&apos;chirish
          </button>
        </AdminForm>
      </details>}
    </div>
  );
}

function ProductFields({
  product,
  categoryId,
  categories,
}: {
  product?: MenuProduct;
  categoryId: number;
  categories: AdminCategory[];
}) {
  const labelClass = "flex flex-col gap-1 text-sm font-medium";
  return (
    <>
      <label className={labelClass}>
        Nomi
        <input name="name" required maxLength={120} defaultValue={product?.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        Tavsif
        <textarea
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={product?.description ?? ""}
          className={`${inputClass} resize-none`}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Narx (so&apos;m)
          <input
            name="price"
            required
            inputMode="numeric"
            defaultValue={product?.price}
            placeholder="45000"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Kategoriya
          <select name="categoryId" defaultValue={categoryId} className={inputClass}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ProductImageInput currentUrl={product?.imageUrl ?? null} />
    </>
  );
}

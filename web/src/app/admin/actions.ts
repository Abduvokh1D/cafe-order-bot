"use server";

import {
  archiveCategory,
  archiveProduct,
  createBanner,
  createCategory,
  createProduct,
  deleteBanner,
  loginAdmin,
  renameCategory,
  setBannerActive,
  setDeliveryPrice,
  setDeliveryTime,
  setProductAvailability,
  updateProduct,
  type ProductInput,
} from "@cafe/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endAdminSession, requireAdmin, startAdminSession } from "@/lib/admin-session";
import type { FormState } from "@/lib/form-state";
import { deleteImage, saveImage } from "@/lib/uploads";

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_PRICE = 100_000_000;
const MAX_DELIVERY_MINUTES = 600;

function text(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function positiveInt(formData: FormData, field: string) {
  const value = Number(text(formData, field));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parseName(formData: FormData) {
  const name = text(formData, "name");
  return name && name.length <= MAX_NAME_LENGTH ? name : null;
}

function parseProduct(formData: FormData): ProductInput | { error: string } {
  const name = parseName(formData);
  if (!name) return { error: `Nomini yozing (${MAX_NAME_LENGTH} belgigacha).` };

  const description = text(formData, "description");
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: `Tavsif ${MAX_DESCRIPTION_LENGTH} belgidan oshmasligi kerak.` };
  }

  // "45 000" kabi yozish mumkin
  const priceText = text(formData, "price").replace(/\s/g, "");
  const price = Number(priceText);
  if (!/^\d+$/.test(priceText) || price > MAX_PRICE) {
    return { error: "Narxni so'mda, butun son bilan yozing, masalan: 45000" };
  }

  const categoryId = positiveInt(formData, "categoryId");
  if (!categoryId) return { error: "Kategoriyani tanlang." };

  return { name, description: description || null, price, categoryId };
}

function uploadedFile(formData: FormData) {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

export async function loginAction(_state: FormState, formData: FormData): Promise<FormState> {
  const result = await loginAdmin(text(formData, "login"), String(formData.get("password") ?? ""));
  if (result.status === "locked") {
    return { error: "Urinishlar ko'p bo'ldi. 15 daqiqadan keyin qayta urinib ko'ring." };
  }
  if (result.status !== "ok") return { error: "Login yoki parol noto'g'ri." };

  await startAdminSession(result.token, result.expiresAt);
  redirect("/admin");
}

export async function logoutAction() {
  await endAdminSession();
  redirect("/admin/login");
}

export async function createCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const name = parseName(formData);
  if (!name) return { error: `Nomini yozing (${MAX_NAME_LENGTH} belgigacha).` };

  await createCategory(admin.cafeId, name);
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function renameCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const name = parseName(formData);
  const categoryId = positiveInt(formData, "id");
  if (!name || !categoryId) return { error: `Nomini yozing (${MAX_NAME_LENGTH} belgigacha).` };

  await renameCategory(admin.cafeId, categoryId, name);
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function archiveCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const categoryId = positiveInt(formData, "id");
  if (!categoryId) return { error: "Kategoriya topilmadi." };

  if (!(await archiveCategory(admin.cafeId, categoryId))) {
    return { error: "Avval ichidagi taomlarni o'chiring yoki boshqa kategoriyaga o'tkazing." };
  }
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function createProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const input = parseProduct(formData);
  if ("error" in input) return input;

  const file = uploadedFile(formData);
  const saved = file ? await saveImage(file) : null;
  if (saved && "error" in saved) return saved;
  const imageUrl = saved?.url ?? null;

  if (!(await createProduct(admin.cafeId, input, imageUrl))) {
    await deleteImage(imageUrl);
    return { error: "Kategoriya topilmadi." };
  }
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function updateProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const productId = positiveInt(formData, "id");
  if (!productId) return { error: "Taom topilmadi." };
  const input = parseProduct(formData);
  if ("error" in input) return input;

  const file = uploadedFile(formData);
  const saved = file ? await saveImage(file) : null;
  if (saved && "error" in saved) return saved;

  // undefined: rasm o'zgarmaydi, null: rasm olib tashlanadi
  const imageUrl = saved ? saved.url : formData.get("removeImage") ? null : undefined;
  const result = await updateProduct(admin.cafeId, productId, input, imageUrl);
  if (!result) {
    await deleteImage(saved?.url ?? null);
    return { error: "Taom yoki kategoriya topilmadi." };
  }

  if (imageUrl !== undefined) await deleteImage(result.previousImageUrl);
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function setAvailabilityAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const productId = positiveInt(formData, "id");
  if (!productId) return { error: "Taom topilmadi." };

  await setProductAvailability(admin.cafeId, productId, text(formData, "isAvailable") === "true");
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function archiveProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const productId = positiveInt(formData, "id");
  if (!productId) return { error: "Taom topilmadi." };

  // Rasm saqlanadi: arxivdagi taom buyurtmalar tarixida qoladi
  await archiveProduct(admin.cafeId, productId);
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function setDeliveryTimeAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const minText = text(formData, "minMinutes");
  const maxText = text(formData, "maxMinutes");

  // Ikkalasi bo'sh bo'lsa, menyuda vaqt ko'rsatilmaydi
  if (!minText && !maxText) {
    await setDeliveryTime(admin.cafeId, null, null);
    revalidatePath("/admin/settings");
    return { ok: true };
  }

  const min = positiveInt(formData, "minMinutes");
  const max = positiveInt(formData, "maxMinutes");
  if (!min || !max || min > max || max > MAX_DELIVERY_MINUTES) {
    return { error: "Vaqtni daqiqada yozing, masalan: 30 va 40. Birinchisi ikkinchisidan katta bo'lmasin." };
  }

  await setDeliveryTime(admin.cafeId, min, max);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function setDeliveryPriceAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  // "10 000" kabi yozish mumkin
  const feeText = text(formData, "deliveryFee").replace(/\s/g, "");
  const freeText = text(formData, "freeDeliveryFrom").replace(/\s/g, "");
  const invalid = { error: "Summani so'mda, butun son bilan yozing, masalan: 10000" };

  if (!feeText && freeText) return { error: "Avval yetkazish narxini yozing." };
  if ((feeText && !/^\d+$/.test(feeText)) || (freeText && !/^\d+$/.test(freeText))) return invalid;

  const fee = feeText ? Number(feeText) : null;
  const freeFrom = freeText ? Number(freeText) : null;
  if ((fee ?? 0) > MAX_PRICE || (freeFrom ?? 0) > MAX_PRICE || freeFrom === 0) return invalid;

  // Narx bepul bo'lsa, chegaraning ma'nosi yo'q
  await setDeliveryPrice(admin.cafeId, fee, fee ? freeFrom : null);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function createBannerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const file = uploadedFile(formData);
  if (!file) return { error: "Rasmni tanlang." };

  const saved = await saveImage(file);
  if ("error" in saved) return saved;

  await createBanner(admin.cafeId, saved.url);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function setBannerActiveAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const bannerId = positiveInt(formData, "id");
  if (!bannerId) return { error: "Rasm topilmadi." };

  await setBannerActive(admin.cafeId, bannerId, text(formData, "isActive") === "true");
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function deleteBannerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const bannerId = positiveInt(formData, "id");
  if (!bannerId) return { error: "Rasm topilmadi." };

  await deleteImage(await deleteBanner(admin.cafeId, bannerId));
  revalidatePath("/admin/settings");
  return { ok: true };
}

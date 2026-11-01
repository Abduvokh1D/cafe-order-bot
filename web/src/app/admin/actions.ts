"use server";

import {
  archiveCategory,
  archivePromo,
  archiveProduct,
  changeOwnPassword,
  createBanner,
  createCategory,
  createProduct,
  createPromo,
  createStaff,
  deleteBanner,
  loginAdmin,
  MIN_PASSWORD_LENGTH,
  moveCategory,
  moveProduct,
  renameCategory,
  resetStaffPassword,
  setBannerActive,
  setCafeAccepting,
  setCafeContacts,
  setCafeHours,
  setDeliveryPrice,
  setDeliveryTime,
  setProductAvailability,
  setPromoActive,
  setStaffActive,
  setStaffRole,
  updateProduct,
  type AdminRole,
  type MoveDirection,
  type ProductInput,
  type PromoInput,
} from "@cafe/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endAdminSession, getSessionToken, requireAdmin, startAdminSession } from "@/lib/admin-session";
import { isValidDay } from "@/lib/day";
import type { FormState } from "@/lib/form-state";
import { deleteImage, saveImage } from "@/lib/uploads";

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_PRICE = 100_000_000;
const MAX_DELIVERY_MINUTES = 600;
const MAX_ADDRESS_LENGTH = 300;
const MAX_LOGIN_LENGTH = 60;
const MAX_PROMO_USES = 1_000_000;
const TIME_FORMAT = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PROMO_CODE_FORMAT = /^[A-Z0-9_-]{3,30}$/;
const ROLES: AdminRole[] = ["owner", "manager", "staff"];

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
  const admin = await requireAdmin("menu");
  const name = parseName(formData);
  if (!name) return { error: `Nomini yozing (${MAX_NAME_LENGTH} belgigacha).` };

  await createCategory(admin.cafeId, name);
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function renameCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("menu");
  const name = parseName(formData);
  const categoryId = positiveInt(formData, "id");
  if (!name || !categoryId) return { error: `Nomini yozing (${MAX_NAME_LENGTH} belgigacha).` };

  await renameCategory(admin.cafeId, categoryId, name);
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function archiveCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("menu");
  const categoryId = positiveInt(formData, "id");
  if (!categoryId) return { error: "Kategoriya topilmadi." };

  if (!(await archiveCategory(admin.cafeId, categoryId))) {
    return { error: "Avval ichidagi taomlarni o'chiring yoki boshqa kategoriyaga o'tkazing." };
  }
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function createProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("menu");
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
  const admin = await requireAdmin("menu");
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
  const admin = await requireAdmin("menu");
  const productId = positiveInt(formData, "id");
  if (!productId) return { error: "Taom topilmadi." };

  // Rasm saqlanadi: arxivdagi taom buyurtmalar tarixida qoladi
  await archiveProduct(admin.cafeId, productId);
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function setDeliveryTimeAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings");
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
  const admin = await requireAdmin("settings");
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
  const admin = await requireAdmin("settings");
  const file = uploadedFile(formData);
  if (!file) return { error: "Rasmni tanlang." };

  const saved = await saveImage(file);
  if ("error" in saved) return saved;

  await createBanner(admin.cafeId, saved.url);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function setBannerActiveAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings");
  const bannerId = positiveInt(formData, "id");
  if (!bannerId) return { error: "Rasm topilmadi." };

  await setBannerActive(admin.cafeId, bannerId, text(formData, "isActive") === "true");
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function deleteBannerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings");
  const bannerId = positiveInt(formData, "id");
  if (!bannerId) return { error: "Rasm topilmadi." };

  await deleteImage(await deleteBanner(admin.cafeId, bannerId));
  revalidatePath("/admin/settings");
  return { ok: true };
}

function parseDirection(formData: FormData): MoveDirection | null {
  const direction = text(formData, "direction");
  return direction === "up" || direction === "down" ? direction : null;
}

export async function moveCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("menu");
  const categoryId = positiveInt(formData, "id");
  const direction = parseDirection(formData);
  if (!categoryId || !direction) return { error: "Kategoriya topilmadi." };

  await moveCategory(admin.cafeId, categoryId, direction);
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function moveProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("menu");
  const productId = positiveInt(formData, "id");
  const direction = parseDirection(formData);
  if (!productId || !direction) return { error: "Taom topilmadi." };

  await moveProduct(admin.cafeId, productId, direction);
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function setCafeContactsAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings");
  const phone = text(formData, "phone");
  const address = text(formData, "address");
  const digits = phone.replace(/\D/g, "");
  if (phone && (!/^\+?[\d\s()-]+$/.test(phone) || digits.length < 9 || digits.length > 15)) {
    return { error: "Telefon raqamini to'g'ri kiriting, masalan: +998 90 123 45 67" };
  }
  if (address.length > MAX_ADDRESS_LENGTH) return { error: `Manzil ${MAX_ADDRESS_LENGTH} belgidan oshmasligi kerak.` };

  await setCafeContacts(admin.cafeId, phone || null, address || null);
  revalidatePath("/admin/settings");
  return { ok: true };
}

function parseTime(value: string) {
  const match = TIME_FORMAT.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export async function setCafeHoursAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings");
  const opensText = text(formData, "opensAt");
  const closesText = text(formData, "closesAt");

  // Ikkalasi bo'sh bo'lsa, kafe doim ochiq hisoblanadi
  if (!opensText && !closesText) {
    await setCafeHours(admin.cafeId, null, null);
    revalidatePath("/admin/settings");
    return { ok: true };
  }

  const opens = parseTime(opensText);
  const closes = parseTime(closesText);
  if (opens === null || closes === null) return { error: "Ochilish va yopilish vaqtini ikkalasini ham kiriting." };
  if (opens === closes) return { error: "Ochilish va yopilish vaqti bir xil bo'lmasin." };

  await setCafeHours(admin.cafeId, opens, closes);
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Oshxona band bo'lganda navbatchi xodim ham to'xtata oladi. */
export async function setAcceptingAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  await setCafeAccepting(admin.cafeId, text(formData, "isAccepting") === "true");
  revalidatePath("/admin");
  return { ok: true };
}

function parseRole(formData: FormData) {
  const role = text(formData, "role") as AdminRole;
  return ROLES.includes(role) ? role : null;
}

function isValidNewPassword(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

const SHORT_PASSWORD = { error: `Parol kamida ${MIN_PASSWORD_LENGTH} belgi bo'lishi kerak.` };

export async function createStaffAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("staff");
  const login = text(formData, "login");
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData);
  if (!login || login.length > MAX_LOGIN_LENGTH || !/^\S+$/.test(login)) {
    return { error: "Login bo'sh joysiz bo'lishi kerak." };
  }
  if (!isValidNewPassword(password)) return SHORT_PASSWORD;
  if (!role) return { error: "Rolni tanlang." };

  if (!(await createStaff(admin.cafeId, login, password, role))) return { error: "Bu login band, boshqasini yozing." };
  revalidatePath("/admin/staff");
  return { ok: true };
}

// O'zini boshqara olmaydi: egasi o'zini o'chirib, kafeni boshqaruvsiz qoldirmasligi uchun
async function requireOtherStaff(formData: FormData) {
  const admin = await requireAdmin("staff");
  const staffId = positiveInt(formData, "id");
  if (!staffId || staffId === admin.adminId) return null;
  return { cafeId: admin.cafeId, staffId };
}

const STAFF_NOT_FOUND = { error: "O'z hisobingizni bu yerda o'zgartirib bo'lmaydi." };

export async function setStaffRoleAction(_state: FormState, formData: FormData): Promise<FormState> {
  const target = await requireOtherStaff(formData);
  const role = parseRole(formData);
  if (!target) return STAFF_NOT_FOUND;
  if (!role) return { error: "Rolni tanlang." };

  await setStaffRole(target.cafeId, target.staffId, role);
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function setStaffActiveAction(_state: FormState, formData: FormData): Promise<FormState> {
  const target = await requireOtherStaff(formData);
  if (!target) return STAFF_NOT_FOUND;

  await setStaffActive(target.cafeId, target.staffId, text(formData, "isActive") === "true");
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function resetStaffPasswordAction(_state: FormState, formData: FormData): Promise<FormState> {
  const target = await requireOtherStaff(formData);
  const password = String(formData.get("password") ?? "");
  if (!target) return STAFF_NOT_FOUND;
  if (!isValidNewPassword(password)) return SHORT_PASSWORD;

  await resetStaffPassword(target.cafeId, target.staffId, password);
  return { ok: true };
}

export async function changePasswordAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const token = await getSessionToken();
  const next = String(formData.get("next") ?? "");
  if (!isValidNewPassword(next)) return SHORT_PASSWORD;

  const isChanged = token && (await changeOwnPassword(admin.adminId, token, String(formData.get("current") ?? ""), next));
  return isChanged ? { ok: true } : { error: "Joriy parol noto'g'ri." };
}

function optionalAmount(formData: FormData, field: string, max: number) {
  const value = text(formData, field).replace(/\s/g, "");
  if (!value) return null;
  return /^\d+$/.test(value) && Number(value) <= max ? Number(value) : Number.NaN;
}

function parsePromo(formData: FormData): PromoInput | { error: string } {
  const code = text(formData, "code").toUpperCase();
  if (!PROMO_CODE_FORMAT.test(code)) return { error: "Kod 3–30 belgi bo'lsin: lotin harfi, raqam, - yoki _." };

  const type = text(formData, "type");
  if (type !== "percent" && type !== "fixed") return { error: "Turini tanlang." };

  const value = optionalAmount(formData, "value", type === "percent" ? 100 : MAX_PRICE);
  if (!value) return { error: type === "percent" ? "Foizni 1 dan 100 gacha yozing." : "Chegirma summasini so'mda yozing." };

  const minOrderAmount = optionalAmount(formData, "minOrderAmount", MAX_PRICE);
  if (Number.isNaN(minOrderAmount)) return { error: "Eng kam buyurtmani so'mda yozing." };

  const maxUses = optionalAmount(formData, "maxUses", MAX_PROMO_USES);
  if (Number.isNaN(maxUses) || maxUses === 0) return { error: "Necha marta ishlatishni musbat son bilan yozing yoki bo'sh qoldiring." };

  const expiresOn = text(formData, "expiresOn");
  if (expiresOn && !isValidDay(expiresOn)) return { error: "Muddatni to'g'ri kiriting." };

  return {
    code,
    type,
    value,
    minOrderAmount: minOrderAmount ?? 0,
    maxUses,
    isOncePerCustomer: formData.get("isOncePerCustomer") !== null,
    expiresOn: expiresOn || null,
  };
}

export async function createPromoAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("promos");
  const input = parsePromo(formData);
  if ("error" in input) return input;

  if (!(await createPromo(admin.cafeId, input))) return { error: "Bu kod allaqachon bor." };
  revalidatePath("/admin/promos");
  return { ok: true };
}

export async function setPromoActiveAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("promos");
  const promoId = positiveInt(formData, "id");
  if (!promoId) return { error: "Promokod topilmadi." };

  await setPromoActive(admin.cafeId, promoId, text(formData, "isActive") === "true");
  revalidatePath("/admin/promos");
  return { ok: true };
}

export async function archivePromoAction(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("promos");
  const promoId = positiveInt(formData, "id");
  if (!promoId) return { error: "Promokod topilmadi." };

  await archivePromo(admin.cafeId, promoId);
  revalidatePath("/admin/promos");
  return { ok: true };
}

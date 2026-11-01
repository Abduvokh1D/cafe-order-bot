import "server-only";
import { deleteAdminSession, getAdminSession } from "@cafe/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission, type Permission } from "@/lib/permissions";

const COOKIE_NAME = "admin_session";

export async function getCurrentAdmin() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? getAdminSession(token) : null;
}

/**
 * Har bir admin sahifasi va amali shu bilan boshlanadi: kafe faqat sessiyadan olinadi, brauzerdan emas.
 * Rol ham har so'rovda bazadan o'qiladi: o'zgartirilsa, darhol kuchga kiradi.
 */
export async function requireAdmin(permission?: Permission) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (permission && !hasPermission(admin.role, permission)) redirect("/admin");
  return admin;
}

export async function getSessionToken() {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

export async function startAdminSession(token: string, expiresAt: Date) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires: expiresAt,
  });
}

export async function endAdminSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await deleteAdminSession(token);
  store.delete({ name: COOKIE_NAME, path: "/admin" });
}

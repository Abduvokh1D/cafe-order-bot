import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { and, asc, eq, gt, lt, ne, sql } from "drizzle-orm";
import { getDb } from "./index.ts";
import { admins, adminSessions, cafes } from "./schema.ts";

const SCRYPT_OPTIONS: ScryptOptions = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 32;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [, salt, key] = stored.split("$");
  const expected = Buffer.from(key, "base64");
  const actual = await deriveKey(password, Buffer.from(salt, "base64"));
  return timingSafeEqual(actual, expected);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeLogin(login: string) {
  return login.trim().toLowerCase();
}

export type LoginResult =
  | { status: "ok"; token: string; expiresAt: Date }
  | { status: "invalid" }
  | { status: "locked" };

export async function loginAdmin(login: string, password: string): Promise<LoginResult> {
  const db = getDb();
  const [admin] = await db.select().from(admins).where(eq(admins.login, normalizeLogin(login)));

  if (!admin || !admin.isActive) {
    // Javob vaqtidan login mavjudligini bilib bo'lmasligi uchun parol baribir hisoblanadi
    await hashPassword(password);
    return { status: "invalid" };
  }

  const now = new Date();
  if (admin.lockedUntil && admin.lockedUntil > now) return { status: "locked" };

  if (!(await verifyPassword(password, admin.passwordHash))) {
    const failedAttempts = admin.failedAttempts + 1;
    const isLocking = failedAttempts >= MAX_FAILED_ATTEMPTS;
    await db
      .update(admins)
      .set({
        failedAttempts: isLocking ? 0 : failedAttempts,
        lockedUntil: isLocking ? new Date(now.getTime() + LOCK_MS) : null,
      })
      .where(eq(admins.id, admin.id));
    return { status: isLocking ? "locked" : "invalid" };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_MS);
  await db.transaction(async (tx) => {
    await tx
      .update(admins)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(admins.id, admin.id));
    await tx.delete(adminSessions).where(lt(adminSessions.expiresAt, now));
    await tx.insert(adminSessions).values({ tokenHash: hashToken(token), adminId: admin.id, expiresAt });
  });
  return { status: "ok", token, expiresAt };
}

export type AdminRole = "owner" | "manager" | "staff";

export type AdminSession = {
  adminId: number;
  login: string;
  role: AdminRole;
  cafeId: number;
  cafeName: string;
  cafeSlug: string;
};

export async function getAdminSession(token: string): Promise<AdminSession | null> {
  const [session] = await getDb()
    .select({
      adminId: admins.id,
      login: admins.login,
      role: admins.role,
      cafeId: cafes.id,
      cafeName: cafes.name,
      cafeSlug: cafes.slug,
    })
    .from(adminSessions)
    .innerJoin(admins, eq(admins.id, adminSessions.adminId))
    .innerJoin(cafes, eq(cafes.id, admins.cafeId))
    // Vaqt bazada solishtiriladi: Next.js oldindan render paytida new Date() ni rad etadi
    .where(
      and(
        eq(adminSessions.tokenHash, hashToken(token)),
        gt(adminSessions.expiresAt, sql`now()`),
        eq(admins.isActive, true),
      ),
    );
  return session ?? null;
}

export async function deleteAdminSession(token: string) {
  await getDb().delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
}

/** Yangi admin yaratadi yoki mavjudining parolini almashtiradi; bunda uning sessiyalari yopiladi. */
export async function saveAdmin(slug: string, login: string, password: string) {
  const db = getDb();
  const [cafe] = await db.select({ id: cafes.id }).from(cafes).where(eq(cafes.slug, slug));
  if (!cafe) return "cafe_not_found" as const;

  const name = normalizeLogin(login);
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(admins).where(eq(admins.login, name));
  if (existing && existing.cafeId !== cafe.id) return "login_taken" as const;

  await db.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(admins)
        .set({ passwordHash, failedAttempts: 0, lockedUntil: null, isActive: true })
        .where(eq(admins.id, existing.id));
      await tx.delete(adminSessions).where(eq(adminSessions.adminId, existing.id));
    } else {
      await tx.insert(admins).values({ cafeId: cafe.id, login: name, passwordHash });
    }
  });
  return existing ? ("updated" as const) : ("created" as const);
}

export type StaffMember = { id: number; login: string; role: AdminRole; isActive: boolean };

export async function listStaff(cafeId: number): Promise<StaffMember[]> {
  return getDb()
    .select({ id: admins.id, login: admins.login, role: admins.role, isActive: admins.isActive })
    .from(admins)
    .where(eq(admins.cafeId, cafeId))
    .orderBy(asc(admins.id));
}

/** Login butun tizimda bitta: boshqa kafeda band bo'lsa ham false qaytaradi. */
export async function createStaff(cafeId: number, login: string, password: string, role: AdminRole) {
  const db = getDb();
  const name = normalizeLogin(login);
  const [existing] = await db.select({ id: admins.id }).from(admins).where(eq(admins.login, name));
  if (existing) return false;
  await db.insert(admins).values({ cafeId, login: name, role, passwordHash: await hashPassword(password) });
  return true;
}

export async function setStaffRole(cafeId: number, adminId: number, role: AdminRole) {
  await getDb()
    .update(admins)
    .set({ role })
    .where(and(eq(admins.cafeId, cafeId), eq(admins.id, adminId)));
}

/** Ishdan ketgan xodim darhol chiqariladi. */
export async function setStaffActive(cafeId: number, adminId: number, isActive: boolean) {
  await getDb().transaction(async (tx) => {
    const rows = await tx
      .update(admins)
      .set({ isActive, failedAttempts: 0, lockedUntil: null })
      .where(and(eq(admins.cafeId, cafeId), eq(admins.id, adminId)))
      .returning({ id: admins.id });
    if (rows.length > 0 && !isActive) await tx.delete(adminSessions).where(eq(adminSessions.adminId, adminId));
  });
}

export async function resetStaffPassword(cafeId: number, adminId: number, password: string) {
  const passwordHash = await hashPassword(password);
  await getDb().transaction(async (tx) => {
    const rows = await tx
      .update(admins)
      .set({ passwordHash, failedAttempts: 0, lockedUntil: null })
      .where(and(eq(admins.cafeId, cafeId), eq(admins.id, adminId)))
      .returning({ id: admins.id });
    if (rows.length > 0) await tx.delete(adminSessions).where(eq(adminSessions.adminId, adminId));
  });
}

/** Joriy parol to'g'ri bo'lsa almashtiradi. Boshqa qurilmalardagi sessiyalar yopiladi, joriysi qoladi. */
export async function changeOwnPassword(adminId: number, currentToken: string, current: string, next: string) {
  const db = getDb();
  const [admin] = await db.select({ passwordHash: admins.passwordHash }).from(admins).where(eq(admins.id, adminId));
  if (!admin || !(await verifyPassword(current, admin.passwordHash))) return false;

  const passwordHash = await hashPassword(next);
  await db.transaction(async (tx) => {
    await tx.update(admins).set({ passwordHash }).where(eq(admins.id, adminId));
    await tx
      .delete(adminSessions)
      .where(and(eq(adminSessions.adminId, adminId), ne(adminSessions.tokenHash, hashToken(currentToken))));
  });
  return true;
}

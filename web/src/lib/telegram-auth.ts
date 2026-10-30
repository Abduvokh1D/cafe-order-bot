import { createHmac, timingSafeEqual } from "node:crypto";

// Eski imzoni qayta ishlatib bo'lmasligi uchun: Mini App ochilganiga 24 soatdan oshsa, rad etiladi
const MAX_AGE_SECONDS = 24 * 60 * 60;

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

/**
 * Mini App'dan kelgan initData'ni tekshiradi: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Imzo to'g'ri bo'lsa foydalanuvchini, aks holda null qaytaradi.
 */
export function verifyInitData(initData: string, botToken: string, now = Date.now()): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest();
  const received = Buffer.from(hash, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || now / 1000 - authDate > MAX_AGE_SECONDS) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "null") as TelegramUser | null;
    return Number.isSafeInteger(user?.id) ? user : null;
  } catch {
    return null;
  }
}

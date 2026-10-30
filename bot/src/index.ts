import { registerCafeBot } from "@cafe/db";
import { Bot, InlineKeyboard } from "grammy";
import { registerStaffHandlers } from "./staff-orders.ts";

// bot/.env — token va Mini App manzili, ildizdagi .env — DATABASE_URL
for (const file of [".env", "../.env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Fayl yo'q — o'zgaruvchilar tizim muhitidan olinadi (masalan, serverda)
  }
}

const token = process.env.BOT_TOKEN;
const baseUrl = process.env.WEBAPP_URL;
const cafeSlug = process.env.CAFE_SLUG;

if (!token) {
  throw new Error("BOT_TOKEN topilmadi. bot/.env faylini .env.example asosida yarating.");
}
if (!baseUrl?.startsWith("https://") || baseUrl === "https://") {
  throw new Error("WEBAPP_URL https:// bilan boshlanadigan to'liq manzil bo'lishi kerak.");
}
if (!cafeSlug) {
  throw new Error("CAFE_SLUG topilmadi. bot/.env faylini .env.example asosida to'ldiring.");
}

// Har bir kafe menyusi o'z manzilida: https://.../sinov-kafe
const webAppUrl = `${baseUrl.replace(/\/+$/, "")}/${cafeSlug}`;

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const name = ctx.from?.first_name ?? "mehmon";
  const keyboard = new InlineKeyboard().webApp("🍽 Menyu", webAppUrl);
  await ctx.reply(
    `Assalomu alaykum, ${name}! Buyurtma berish uchun menyuni oching.`,
    { reply_markup: keyboard },
  );
});

// Guruhni kafega ulash uchun uning raqamini ko'rsatadi. Raqamni bilgan odam ulana olmaydi:
// ulash faqat bazada qilinadi, shuning uchun begona guruhga buyurtma ketmaydi
bot.command("chatid", async (ctx) => {
  await ctx.reply(`Bu chat raqami: ${ctx.chat.id}`);
});

registerStaffHandlers(bot, cafeSlug);

bot.catch((err) => {
  console.error("Bot xatosi:", err.error);
});

// Mini App imzosini server shu token bilan tekshiradi
if (!(await registerCafeBot(cafeSlug, token))) {
  throw new Error(`"${cafeSlug}" kafesi bazada topilmadi. bot/.env dagi CAFE_SLUG ni tekshiring.`);
}

// Xabar yozish maydoni yonidagi doimiy "Menyu" tugmasi
await bot.api.setChatMenuButton({
  menu_button: { type: "web_app", text: "Menyu", web_app: { url: webAppUrl } },
});

await bot.start({
  onStart: (me) => console.log(`@${me.username} ishga tushdi`),
});

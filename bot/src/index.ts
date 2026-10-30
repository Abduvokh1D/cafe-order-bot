import { Bot, InlineKeyboard } from "grammy";

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

bot.catch((err) => {
  console.error("Bot xatosi:", err.error);
});

// Xabar yozish maydoni yonidagi doimiy "Menyu" tugmasi
await bot.api.setChatMenuButton({
  menu_button: { type: "web_app", text: "Menyu", web_app: { url: webAppUrl } },
});

await bot.start({
  onStart: (me) => console.log(`@${me.username} ishga tushdi`),
});

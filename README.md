# Cafe Order Bot

Kafe va oshxonalar uchun Telegram bot + Mini App orqali buyurtma qabul qilish tizimi.
Reja va jurnal: [PLAN.md](PLAN.md).

## Tuzilma

| Papka | Nima |
|---|---|
| `web/` | Next.js: Mini App (mijoz menyusi) va keyinchalik admin panel |
| `bot/` | grammY bot: `/start`, "Menyu" tugmasi, buyurtma xabarlari |

## Ishga tushirish (ishlab chiqish)

1. Mini App:
   ```bash
   npm run dev --prefix web
   ```
2. Tunnel (Telegram faqat HTTPS manzilni ochadi):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
3. `bot/.env.example` faylini `bot/.env` nomi bilan nusxalang, `BOT_TOKEN` va tunnel manzilini (`WEBAPP_URL`) yozing.
4. Bot:
   ```bash
   npm run dev --prefix bot
   ```

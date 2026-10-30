# Cafe Order Bot

Kafe va oshxonalar uchun Telegram bot + Mini App orqali buyurtma qabul qilish tizimi.
Reja va jurnal: [PLAN.md](PLAN.md).

## Tuzilma

npm workspaces: paketlar ildiz papkadan bitta `npm install` bilan o'rnatiladi.

| Papka | Nima |
|---|---|
| `web/` | Next.js: Mini App (mijoz menyusi) va keyinchalik admin panel |
| `bot/` | grammY bot: `/start`, "Menyu" tugmasi, buyurtma xabarlari |
| `db/` | `@cafe/db`: Drizzle sxemasi, migratsiyalar, namunaviy ma'lumotlar |

## Birinchi sozlash

1. Paketlar:
   ```bash
   npm install
   ```
2. `.env.example` faylini ildizda `.env` nomi bilan nusxalang va parolni o'zgartiring.
3. Docker Desktop'ni yoqing, keyin bazani tayyorlang:
   ```bash
   npm run db:up
   ```
   ```bash
   npm run db:migrate
   ```
   ```bash
   npm run db:seed
   ```

## Ishga tushirish (ishlab chiqish)

1. Mini App:
   ```bash
   npm run dev:web
   ```
2. Tunnel (Telegram faqat HTTPS manzilni ochadi):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
3. `bot/.env.example` faylini `bot/.env` nomi bilan nusxalang, `BOT_TOKEN` va tunnel manzilini (`WEBAPP_URL`) yozing.
4. Bot:
   ```bash
   npm run dev:bot
   ```

## Baza sxemasini o'zgartirish

`db/src/schema.ts` ni tahrirlang, keyin migratsiya yarating va qo'llang:

```bash
npm run db:generate
```
```bash
npm run db:migrate
```

Ma'lumotlarni ko'rish uchun: `npm run db:studio`.

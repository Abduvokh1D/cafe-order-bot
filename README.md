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
3. `bot/.env.example` faylini `bot/.env` nomi bilan nusxalang, `BOT_TOKEN`, tunnel manzilini (`WEBAPP_URL`) va kafe nomini (`CAFE_SLUG`) yozing. Menyu `WEBAPP_URL/CAFE_SLUG` manzilida ochiladi.
4. Bot:
   ```bash
   npm run dev:bot
   ```

## Admin panel

Kafe egasi uchun: `/admin` (buyurtmalar va kunlik hisobot) va `/admin/menu` (menyuni tahrirlash).

Admin yaratish yoki parolni almashtirish (login va parol terminalda so'raladi):

```bash
npm run db:create-admin
```

Yuklangan rasmlar `data/uploads/` papkasida saqlanadi (`UPLOADS_DIR` bilan o'zgartirish mumkin) va git'ga tushmaydi. Serverda bu papkani ham zaxiralash kerak.

`admin`, `api` va `uploads` nomlari band: kafe `slug`i bo'la olmaydi.

## Xodimlar guruhini ulash

Buyurtmalar kafe xodimlarining Telegram guruhiga keladi va u yerda qabul yoki bekor qilinadi.

1. Guruh oching va botni unga qo'shing.
2. Guruhda `/chatid@BOT_USERNAME` deb yozing, bot guruh raqamini aytadi.
3. Raqamni bazaga yozing (`-100123` o'rniga guruh raqami, `sinov-kafe` o'rniga kafe):
   ```bash
   docker exec cafe-postgres psql -U cafe -d cafe -c "update cafes set staff_chat_id=-100123 where slug='sinov-kafe'"
   ```

Guruh supergroup'ga aylansa, raqami o'zgaradi: buyurtma xato bersa, shu qadamlarni takrorlang.

## Baza sxemasini o'zgartirish

`db/src/schema.ts` ni tahrirlang, keyin migratsiya yarating va qo'llang:

```bash
npm run db:generate
```
```bash
npm run db:migrate
```

Ma'lumotlarni ko'rish uchun: `npm run db:studio`.

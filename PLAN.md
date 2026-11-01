# Telegram buyurtma tizimi — loyiha rejasi

Kafe va oshxonalar uchun Telegram bot + Mini App orqali buyurtma qabul qilish tizimi.
Bitta tizim ko'p kafega xizmat qiladi (multi-tenant): har bir kafening o'z boti, menyusi va admin paneli bo'ladi.

**Ish rejimi:** qo'shimcha ish, haftasiga taxminan 8 soat.
**Maqsad:** ~6 haftada birinchi sinov kafe, ~3 oyda birinchi pullik mijoz.

---

## Texnologiyalar

| Qism | Texnologiya |
|---|---|
| Mini App (mijoz menyusi) + admin panel | Next.js, TypeScript, Tailwind CSS |
| Ma'lumotlar bazasi | PostgreSQL: ishlab chiqishda kompyuterda (Docker), ishga tushirishda VPS'da |
| Baza bilan ishlash | Drizzle ORM (baza qayerda turishidan qat'i nazar kod o'zgarmaydi) |
| Admin panelga kirish | Auth.js yoki oddiy login; mijozlar Telegram orqali tasdiqlanadi |
| Taom rasmlari | Server diskida yoki Cloudflare R2 |
| Telegram bot | grammY (Node.js) |
| Hosting | Bitta VPS (Next.js + bot + PostgreSQL), Docker orqali |
| To'lov | Boshida naqd, keyin Click / Payme |

---

## Haftalik reja

### 1-hafta — Tayyorgarlik
- [x] Node.js (LTS), VS Code, Git o'rnatilgan
- [x] GitHub'da yangi repozitoriy
- [x] @BotFather orqali sinov bot yaratildi, token `.env` faylda (hech kimga yuborilmaydi)
- [x] Next.js loyiha yaratildi
- [x] Bot "/start" ga javob beradi va "Menyu" tugmasi Mini App'ni ochadi

### 2-hafta — Ma'lumotlar bazasi
- [x] Docker o'rnatildi, PostgreSQL kompyuterda ishga tushirildi
- [x] Drizzle ORM ulandi, migratsiyalar sozlandi
- [x] Jadvallar: `cafes`, `categories`, `products`, `customers`, `orders`, `order_items`
- [x] Har bir jadvalda `cafe_id` (bir nechta kafe uchun)
- [x] Sinov kafe uchun namunaviy menyu kiritildi

### 3–4-hafta — Mini App: menyu va savat
- [x] Kategoriyalar va taomlar ro'yxati (rasm, narx, tavsif)
- [x] Savatga qo'shish, sonini o'zgartirish, o'chirish
- [x] Telegram mavzusiga (yorug'/qorong'i) moslashuv

### 5-hafta — Buyurtma berish
- [x] Yetkazib berish / olib ketish tanlovi
- [x] Manzil yoki lokatsiya, telefon raqami
- [x] Buyurtma bazaga yoziladi
- [x] Kafe xodimlari Telegram guruhiga xabar: "Qabul qilish" / "Bekor qilish" tugmalari

### 6-hafta — Buyurtma holati
- [x] Mijozga bot orqali holat: Qabul qilindi → Tayyorlanmoqda → Yo'lda → Yetkazildi (olib ketishda: Tayyor → Topshirildi)
- [x] **Bosqich natijasi: sinov kafega ko'rsatishga tayyor MVP**

### 7–8-hafta — Admin panel
- [x] Kafe egasi uchun kirish (login)
- [x] Menyuni tahrirlash: taom qo'shish, narx, rasm yuklash, "tugadi" belgisi
- [x] Buyurtmalar ro'yxati va oddiy kunlik hisobot

### 9-hafta — Ishga tushirish
- [ ] Domen va hosting
- [ ] Sinov kafe topildi va ulandi

### 10–11-hafta — Sinov davri
- [ ] Kafe 2 hafta bepul ishlatadi
- [ ] Xodimlar va mijozlardan fikr yig'ish, xatolarni tuzatish

### 12-hafta — Sotuvga tayyorlash
- [ ] Click / Payme ulash (yoki naqd bilan sotishni boshlash)
- [ ] Narx va shartlar belgilandi
- [ ] Sinov kafe natijalari bilan boshqa kafelarga taklif

---

## Bajarilgan ishlar jurnali

_Har bir ish sessiyasidan keyin bu yerga 1–2 qator yoziladi: nima qilindi, keyingi qadam nima._

- 2026-10-30: Loyiha g'oyasi va reja tasdiqlandi. Keyingi qadam: 1-hafta tayyorgarligi.
- 2026-10-30: Supabase o'rniga boshidan oddiy PostgreSQL + Drizzle ORM tanlandi.
- 2026-10-30: Git, `web/` (Next.js 16 Mini App sahifasi) va `bot/` (grammY, /start + "Menyu" tugmasi) tayyorlandi. Keyingi qadam: BotFather tokeni, tunnel (cloudflared) va botni Telegram'da sinash.
- 2026-10-30: Bot va Mini App Telegram'da tunnel orqali sinaldi, ishlayapti. 1-hafta yakunlandi. Keyingi qadam: 2-hafta, PostgreSQL (Docker) va Drizzle ORM.
- 2026-10-30: 2-hafta yakunlandi: PostgreSQL 17 (Docker), npm workspaces, umumiy `db/` paketi, 6 ta jadval va sinov menyusi (7 ta taom). Bog'lanishlar (cafe_id, id) orqali tekshiriladi. Keyingi qadam: 3-hafta, Mini App'da kategoriyalar va taomlar ro'yxati.
- 2026-10-30: 3–4-hafta yakunlandi va Telegram'da sinaldi: har bir kafe menyusi o'z manzilida (`/sinov-kafe`), savat telefon xotirasida (faqat id va son, narx bazadan), Telegram ranglari va xato sahifalari. Bot `CAFE_SLUG` orqali kafega ulanadi. Keyingi qadam: 5-hafta, buyurtma berish.
- 2026-10-30: 5-hafta yakunlandi va Telegram'da sinaldi: buyurtma formasi, initData imzosi, narxni serverda hisoblash, xodimlar guruhiga xabar va tugmalar. Bot tokeni `cafes.bot_token` da ochiq saqlanadi: serverga chiqishda shifrlashni ko'rib chiqish kerak. Keyingi qadam: 6-hafta, mijozga buyurtma holati xabarlari.
- 2026-10-30: MVP tayyor va Telegram'da sinaldi: buyurtma to'liq yo'lni bosib o'tadi, mijoz har qadamda bot orqali xabar oladi, bekor qilish tasdiq so'raydi. Olib ketish uchun "Tayyor" holati qo'shildi. Keyingi qadam: 7–8-hafta, admin panel; hozircha MVP faqat kompyuter va tunnel orqali ishlaydi, kafega ko'rsatishdan oldin serverga chiqish kerak.
- 2026-10-30: Admin panel tayyor va sinaldi: kirish (scrypt, bazadagi sessiyalar, 5 urinishdan keyin blok), menyuni tahrirlash, rasm yuklash (brauzerda kichraytiriladi, `data/uploads`), buyurtmalar va kunlik hisobot. Taom va kategoriya o'chirilmaydi, arxivlanadi. Keyingi qadam: 9-hafta, domen va hosting.
- 2026-10-31: Serverga chiqish tayyorlandi va kompyuterda production rejimida sinaldi: Docker image'lar (`web`, `tools`), Caddy (HTTPS), zaxira va tiklash skriptlari, `db:create-cafe`, qo'llanma `DEPLOY.md`. Bot tokeni hozircha shifrlanmadi: kalit baribir shu serverda turadi, zaxira nusxalar maxfiy saqlanadi. Haqiqiy Telegram va Let's Encrypt faqat serverda sinaladi. Keyingi qadam: VPS va domen olish.
- 2026-10-31: Mini App dizayni yangilandi: qidiruv, chegirma rasmlari (admin yoqib-o'chiradi), taom turlari, yetkazish vaqti, pastki navbar, 2 ustunli kartalar va "Buyurtmalarim" (Telegram imzosi bilan). Admin panelga "Sozlamalar" qo'shildi. VPS sinov kafe topilganda olinadi.
- 2026-10-31: Asosiy rang sariq qilindi, savat to'liq ekranga o'tdi ("Yana nimadir?", izoh, vilka-qoshiq), manzil xaritadan tanlanadi (Leaflet va OpenStreetMap). Xaritadagi nuqta manzil matniga aylantirilmaydi: xodimlarga xarita havolasi boradi. Mijozlar ko'paysa, xarita xizmatini almashtirish kerak bo'ladi.
- 2026-10-31: "Buyurtmalarim" faol va kulrang oldingi buyurtmalarga ajratildi, buyurtmani kuzatish sahifasi qo'shildi (holat, bosqichlar, taxminiy vaqt, o'zi yangilanadi). Xaritada jonli kuryer yo'q: buning uchun kuryer ilovasi kerak.
- 2026-10-31: Buyurtmaga to'lov turi qo'shildi: naqd yoki karta, buyurtmani olganda to'lanadi. Onlayn to'lov hali yo'q (12-hafta).
- 2026-10-31: Yetkazish narxi qo'shildi: kafe narx va bepul chegarani "Sozlamalar"da kiritadi, summa serverda ham shu qoida bilan hisoblanadi (`db/src/pricing.ts`) va buyurtmada saqlanadi. Kunlik hisobot summasiga yetkazish narxi ham kiradi.

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
- [ ] Docker o'rnatildi, PostgreSQL kompyuterda ishga tushirildi
- [ ] Drizzle ORM ulandi, migratsiyalar sozlandi
- [ ] Jadvallar: `cafes`, `categories`, `products`, `customers`, `orders`, `order_items`
- [ ] Har bir jadvalda `cafe_id` (bir nechta kafe uchun)
- [ ] Sinov kafe uchun namunaviy menyu kiritildi

### 3–4-hafta — Mini App: menyu va savat
- [ ] Kategoriyalar va taomlar ro'yxati (rasm, narx, tavsif)
- [ ] Savatga qo'shish, sonini o'zgartirish, o'chirish
- [ ] Telegram mavzusiga (yorug'/qorong'i) moslashuv

### 5-hafta — Buyurtma berish
- [ ] Yetkazib berish / olib ketish tanlovi
- [ ] Manzil yoki lokatsiya, telefon raqami
- [ ] Buyurtma bazaga yoziladi
- [ ] Kafe xodimlari Telegram guruhiga xabar: "Qabul qilish" / "Bekor qilish" tugmalari

### 6-hafta — Buyurtma holati
- [ ] Mijozga bot orqali holat: Qabul qilindi → Tayyorlanmoqda → Yo'lda → Yetkazildi
- [ ] **Bosqich natijasi: sinov kafega ko'rsatishga tayyor MVP**

### 7–8-hafta — Admin panel
- [ ] Kafe egasi uchun kirish (login)
- [ ] Menyuni tahrirlash: taom qo'shish, narx, rasm yuklash, "tugadi" belgisi
- [ ] Buyurtmalar ro'yxati va oddiy kunlik hisobot

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

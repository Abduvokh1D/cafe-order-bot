# Serverga chiqish

Bitta VPS'da to'liq tizim Docker orqali ishlaydi: Caddy (HTTPS), Next.js, bot va PostgreSQL.
Tashqariga faqat 80 va 443 portlar ochiladi. Baza tarmoqqa chiqmaydi.

## Nima kerak

- **VPS:** Ubuntu 24.04, kamida 2 vCPU, 2 GB RAM, 40 GB disk. Ishlash paytida xizmatlar 100 MB atrofida xotira oladi, ko'p xotira faqat `next build` ga kerak.
- **Domen:** A yozuvi server IP manziliga qarab turishi kerak. Subdomen ham bo'ladi (masalan, `menu.example.uz`).
- **Bot:** production uchun @BotFather'da alohida bot oching. Bitta token bilan ikki joyda ishlab bo'lmaydi: Telegram ikkinchisiga 409 xatosini beradi, ya'ni kompyuterdagi bot bilan to'qnashadi.

## 1. Serverni tayyorlash

Server terminalida, `root` sifatida. Avval SSH kalit bilan kirishni sozlang va parol bilan kirishni o'chiring.

Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

Faqat kerakli portlar:

```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw enable
```

Swap (`next build` 2 GB RAM'da xotiraga sig'may qolmasligi uchun):

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 2. Loyiha va sozlamalar

```bash
git clone https://github.com/Abduvokh1D/cafe-order-bot.git /opt/cafe-order-bot
```

```bash
cd /opt/cafe-order-bot && cp .env.production.example .env && chmod 600 .env
```

Baza paroli uchun tasodifiy qiymat:

```bash
openssl rand -hex 32
```

`.env` ni to'ldiring (`DOMAIN`, `POSTGRES_PASSWORD`, `BOT_TOKEN`, `CAFE_SLUG`):

```bash
nano .env
```

Repozitoriy Private bo'lsa, `git clone` uchun GitHub'da shu serverga deploy key qo'shing.

## 3. Birinchi ishga tushirish

Image'larni yig'ish va baza jadvallarini yaratish:

```bash
docker compose -f docker-compose.prod.yml up --build migrate
```

Kafe yaratish (`.env` dagi `CAFE_SLUG` bilan bir xil nom kiriting):

```bash
docker compose -f docker-compose.prod.yml run --rm tools npm run -s db:create-cafe
```

Kafe egasi uchun admin:

```bash
docker compose -f docker-compose.prod.yml run --rm tools npm run -s db:create-admin
```

Hammasini yoqish:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Holatini ko'rish (`web` healthy, `bot` Up bo'lishi kerak):

```bash
docker compose -f docker-compose.prod.yml ps
```

Loglar:

```bash
docker compose -f docker-compose.prod.yml logs -f --tail 50 bot web caddy
```

Keyin `https://DOMEN/admin` ga kirib menyuni to'ldiring.

## 4. Xodimlar guruhini ulash

1. Guruh oching va botni unga qo'shing.
2. Guruhda `/chatid@BOT_USERNAME` deb yozing.
3. Raqamni bazaga yozing (`-100123` va `kafe-nomi` o'rniga o'zingiznikini):
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres psql -U cafe -d cafe -c "update cafes set staff_chat_id=-100123 where slug='kafe-nomi'"
   ```

## 5. Zaxira nusxa

`scripts/backup.sh` baza va rasmlarni `backups/` papkasiga saqlaydi, 14 kundan eskilarini o'chiradi.

Har kecha avtomatik ishlashi uchun `crontab -e` ga shu qatorni qo'shing:

```
0 3 * * * cd /opt/cafe-order-bot && sh scripts/backup.sh >> backups.log 2>&1
```

**Serverning o'zidagi nusxa server bilan birga yo'qoladi.** Nusxani muntazam boshqa joyga ham ko'chiring, masalan, o'z kompyuteringizga:

```bash
scp -r root@SERVER_IP:/opt/cafe-order-bot/backups ./cafe-backups
```

Nusxada bot tokeni, mijozlarning telefon raqami va manzili bor: uni ochiq joyda saqlamang.

Tiklash (hozirgi baza o'chadi, tasdiq so'raladi):

```bash
sh scripts/restore.sh backups/db_XXX.dump backups/uploads_XXX.tar.gz
```

## 6. Yangilash

Yangi migratsiyalar `migrate` xizmati orqali o'zi qo'llanadi.

```bash
cd /opt/cafe-order-bot && git pull && sh scripts/backup.sh && docker compose -f docker-compose.prod.yml up -d --build
```

Eski image'lar diskni to'ldirmasligi uchun:

```bash
docker image prune -f
```

## Ma'lum cheklovlar

- Bitta `.env` bitta bot va bitta kafega xizmat qiladi. Ikkinchi kafe uchun `docker-compose.prod.yml` ga yana bir bot xizmati qo'shish kerak bo'ladi.
- Bot tokeni `cafes.bot_token` da ochiq turadi. Shifrlash kaliti baribir shu serverda turgani uchun hozircha shifrlanmagan, shuning uchun zaxira nusxalarni maxfiy saqlang.

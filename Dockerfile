# Ikkita image: "web" (Next.js) va "tools" (bot, migratsiya, admin yaratish).
# Maxfiy sozlamalar image ichiga tushmaydi: .env fayllari .dockerignore'da,
# qiymatlar ishga tushganda docker-compose.prod.yml orqali beriladi.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/
COPY bot/package.json bot/
COPY db/package.json db/
RUN npm ci

FROM deps AS web-build
ENV NEXT_TELEMETRY_DISABLED=1
COPY db db
COPY web web
RUN npm run build -w web

FROM node:22-alpine AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Docker HOSTNAME'ga konteyner nomini yozadi: server tashqaridan ko'rinishi uchun almashtiriladi
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV UPLOADS_DIR=/data/uploads
WORKDIR /app
# Volume birinchi ulanganda shu papkaning egasini oladi: rasm yozish uchun kerak
RUN mkdir -p /data/uploads && chown node:node /data/uploads
COPY --from=web-build --chown=node:node /app/web/.next/standalone ./
COPY --from=web-build --chown=node:node /app/web/.next/static web/.next/static
COPY --from=web-build --chown=node:node /app/web/public web/public
USER node
EXPOSE 3000
CMD ["node", "web/server.js"]

FROM deps AS tools
ENV NODE_ENV=production
COPY db db
COPY bot bot
USER node

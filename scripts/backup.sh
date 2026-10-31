#!/bin/sh
# Baza va yuklangan rasmlarni backups/ papkasiga saqlaydi, eskilarini o'chiradi.
# Nusxada bot tokeni va mijozlar ma'lumoti bor: fayllar faqat egasiga ochiq.
set -eu

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
stamp="$(date +%Y-%m-%d_%H%M%S)"

umask 077
mkdir -p "$BACKUP_DIR"

# Avval vaqtinchalik nomga yoziladi: uzilib qolgan nusxa tayyor fayl bo'lib ko'rinmaydi
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U cafe -d cafe --format=custom > "$BACKUP_DIR/db_$stamp.dump.tmp"
mv "$BACKUP_DIR/db_$stamp.dump.tmp" "$BACKUP_DIR/db_$stamp.dump"

docker compose -f docker-compose.prod.yml exec -T web \
  tar -czf - -C /data uploads > "$BACKUP_DIR/uploads_$stamp.tar.gz.tmp"
mv "$BACKUP_DIR/uploads_$stamp.tar.gz.tmp" "$BACKUP_DIR/uploads_$stamp.tar.gz"

find "$BACKUP_DIR" -type f \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' -o -name '*.tmp' \) \
  -mtime "+$KEEP_DAYS" -delete

echo "Saqlandi: $BACKUP_DIR/db_$stamp.dump, $BACKUP_DIR/uploads_$stamp.tar.gz"

#!/bin/sh
# Zaxira nusxadan tiklaydi. Hozirgi baza nusxadagi holat bilan almashtiriladi.
# Ishlatish: scripts/restore.sh backups/db_XXX.dump backups/uploads_XXX.tar.gz
set -eu

if [ "$#" -ne 2 ] || [ ! -f "$1" ] || [ ! -f "$2" ]; then
  echo "Ishlatish: $0 <db_XXX.dump> <uploads_XXX.tar.gz>" >&2
  exit 1
fi
db_file="$(realpath "$1")"
uploads_file="$(realpath "$2")"

cd "$(dirname "$0")/.."

printf "Hozirgi baza o'chirilib, nusxadan tiklanadi. Davom etish uchun \"ha\" deb yozing: "
read -r answer
[ "$answer" = "ha" ] || { echo "Bekor qilindi."; exit 1; }

docker compose -f docker-compose.prod.yml stop caddy web bot

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U cafe -d cafe --clean --if-exists --no-owner < "$db_file"

docker compose -f docker-compose.prod.yml run --rm --no-deps -T web \
  tar -xzf - -C /data < "$uploads_file"

docker compose -f docker-compose.prod.yml up -d

echo "Tiklandi."

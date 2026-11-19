#!/usr/bin/env bash
# Deploy self-hosted (FRONTEND_PLAN.md → "Despliegue — self-hosted").
#
# En la máquina de despliegue, desde este repo (con el backend clonado
# lado a lado en ../CoffeeProyect):
#   ./deploy.sh
#
# Pasos: pull de ambos repos → backup pg_dump (si la DB ya existe) →
# build + up del stack → prune de imágenes viejas (obligatorio en la
# máquina de 4 GB para no llenar el disco).
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.prod.yml"
BACKEND_DIR="$(cd .. && pwd)/CoffeeProyect"

if [ ! -d "$BACKEND_DIR/.git" ]; then
  echo "ERROR: no encontré el repo del backend en $BACKEND_DIR" >&2
  echo "Clonarlo lado a lado: git clone <url-backend> $BACKEND_DIR" >&2
  exit 1
fi

echo "→ git pull (web + backend)"
git pull --ff-only
git -C "$BACKEND_DIR" pull --ff-only

# Backup solo si ya hay stack corriendo (primer deploy: no hay datos aún).
if [ -n "$($COMPOSE ps -q postgres 2>/dev/null)" ]; then
  echo "→ backup pg_dump"
  BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
  mkdir -p "$BACKUP_DIR"
  STAMP="$(date +%F_%H%M)"
  $COMPOSE exec -T postgres pg_dump -U coffee coffeedb \
    | gzip > "$BACKUP_DIR/coffeedb-$STAMP.sql.gz"
  echo "  guardado en $BACKUP_DIR/coffeedb-$STAMP.sql.gz"
else
  echo "→ sin stack previo: se omite el backup (primer deploy)"
fi

echo "→ build + up"
$COMPOSE up -d --build

# Caddy no siempre detecta cambios del Caddyfile montado desde el host
# (git pull puede reemplazar el inode); se fuerza el reload explícito.
echo "→ caddy reload"
$COMPOSE exec -T caddy caddy reload --config /etc/caddy/Caddyfile

echo "→ docker system prune (imágenes viejas)"
docker system prune -f

echo ""
echo "Listo. Health check:"
echo "  curl http://localhost/            (web)"
echo "  curl http://localhost/api/health  (api vía Caddy)"

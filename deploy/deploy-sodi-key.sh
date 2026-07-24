#!/usr/bin/env bash
set -Eeuo pipefail

# Script de despliegue de Sodi Key (frontend estático, sin backend ni base de datos).
# Vive versionado en el repo (deploy/deploy-sodi-key.sh) y se ejecuta desde
# /opt/sodi-platform/infra/scripts/deploy-sodi-key.sh en el servidor.
#
# Uso: deploy-sodi-key.sh [commit-sha-esperado]
#   Si se pasa un SHA, el script falla si el commit desplegado no coincide.

APP_DIR="/opt/sodi-platform/apps/sodi-key"
REPO_URL="git@github.com-sodikey:ArguetaCode/Llavero.git"
BRANCH="main"
LOG_DIR="/opt/sodi-platform/logs/deploy"
LOCK_FILE="/tmp/sodi-key-deploy.lock"
STATE_FILE="$APP_DIR/.last-good-image-tag"
HEALTH_TIMEOUT=90
HEALTH_INTERVAL=3
EXPECTED_SHA="${1:-}"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_DIR/sodi-key-deploy.log") 2>&1

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[ERROR] Ya hay un despliegue de Sodi Key en ejecución."
  exit 1
fi

echo "[INFO] Despliegue Sodi Key iniciado: $(date --iso-8601=seconds)"

PREV_TAG="latest"
if [ -f "$STATE_FILE" ]; then
  PREV_TAG="$(cat "$STATE_FILE")"
fi

if [ ! -d "$APP_DIR/.git" ]; then
  rmdir "$APP_DIR" 2>/dev/null || true
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch --prune origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
  git clean -fd
fi

cd "$APP_DIR"

NEW_SHA="$(git rev-parse HEAD)"
NEW_SHORT_SHA="$(git rev-parse --short HEAD)"

if [ -n "$EXPECTED_SHA" ] && [ "$NEW_SHA" != "$EXPECTED_SHA" ]; then
  echo "[ERROR] Commit desplegado ($NEW_SHA) no coincide con el esperado ($EXPECTED_SHA)."
  exit 1
fi

echo "[INFO] Construyendo imagen sodi-key-web:${NEW_SHORT_SHA}"
IMAGE_TAG="$NEW_SHORT_SHA" docker compose -f compose.production.yml build

echo "[INFO] Levantando sodi_key_web con la nueva imagen"
IMAGE_TAG="$NEW_SHORT_SHA" docker compose -f compose.production.yml up --detach --remove-orphans

echo "[INFO] Esperando healthcheck (timeout ${HEALTH_TIMEOUT}s)"
elapsed=0
status=""
while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
  status="$(docker inspect --format='{{.State.Health.Status}}' sodi_key_web 2>/dev/null || echo "desconocido")"
  if [ "$status" = "healthy" ]; then
    break
  fi
  sleep "$HEALTH_INTERVAL"
  elapsed=$((elapsed + HEALTH_INTERVAL))
done

if [ "$status" != "healthy" ]; then
  echo "[ERROR] sodi_key_web no quedó healthy (estado: ${status}). Iniciando rollback a ${PREV_TAG}."

  IMAGE_TAG="$NEW_SHORT_SHA" docker compose -f compose.production.yml down || true

  IMAGE_TAG="$PREV_TAG" docker compose -f compose.production.yml up --detach --remove-orphans

  rollback_elapsed=0
  rollback_status=""
  while [ "$rollback_elapsed" -lt "$HEALTH_TIMEOUT" ]; do
    rollback_status="$(docker inspect --format='{{.State.Health.Status}}' sodi_key_web 2>/dev/null || echo "desconocido")"
    if [ "$rollback_status" = "healthy" ]; then
      break
    fi
    sleep "$HEALTH_INTERVAL"
    rollback_elapsed=$((rollback_elapsed + HEALTH_INTERVAL))
  done

  if [ "$rollback_status" = "healthy" ]; then
    echo "[OK] Rollback a ${PREV_TAG} completado, sodi_key_web healthy nuevamente."
  else
    echo "[CRITICO] Rollback a ${PREV_TAG} tampoco quedó healthy (estado: ${rollback_status}). Requiere intervención manual."
  fi

  echo "[ERROR] Despliegue del commit ${NEW_SHORT_SHA} fallido: $(date --iso-8601=seconds)"
  exit 1
fi

docker exec sodi_key_web wget -qO- http://127.0.0.1/health >/dev/null

docker tag "sodi-key-web:${NEW_SHORT_SHA}" sodi-key-web:latest
echo "$NEW_SHORT_SHA" > "$STATE_FILE"

echo "[OK] Commit desplegado: ${NEW_SHORT_SHA}"
echo "[OK] Despliegue Sodi Key finalizado: $(date --iso-8601=seconds)"

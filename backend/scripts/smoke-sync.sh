#!/usr/bin/env sh
set -eu

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
RUN_ID="$(date +%s)"
EMAIL="smoke-${RUN_ID}@example.test"
REMOTE_PASSWORD="remote-password-smoke-${RUN_ID}"
CLIENT_VAULT_ID="smoke-local-vault-${RUN_ID}"

extract_json_string() {
  key="$1"
  sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" | head -n 1
}

request() {
  method="$1"
  path="$2"
  data="${3:-}"
  auth_header="${4:-}"

  if [ -n "$data" ] && [ -n "$auth_header" ]; then
    curl -fsS -X "$method" "${API_BASE_URL}${path}" \
      -H "Content-Type: application/json" \
      -H "$auth_header" \
      -d "$data"
  elif [ -n "$data" ]; then
    curl -fsS -X "$method" "${API_BASE_URL}${path}" \
      -H "Content-Type: application/json" \
      -d "$data"
  elif [ -n "$auth_header" ]; then
    curl -fsS -X "$method" "${API_BASE_URL}${path}" \
      -H "$auth_header"
  else
    curl -fsS -X "$method" "${API_BASE_URL}${path}"
  fi
}

echo "Smoke backend sync against ${API_BASE_URL}"

health="$(request GET /api/health)"
echo "$health" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'
echo "health: ok"

register_payload="{\"email\":\"${EMAIL}\",\"displayName\":\"Smoke QA\",\"password\":\"${REMOTE_PASSWORD}\"}"
register_response="$(request POST /api/auth/register "$register_payload")"
register_token="$(printf '%s' "$register_response" | extract_json_string token)"
test -n "$register_token"
echo "register: ok token_prefix=$(printf '%s' "$register_token" | cut -c 1-8)..."

login_payload="{\"email\":\"${EMAIL}\",\"password\":\"${REMOTE_PASSWORD}\"}"
login_response="$(request POST /api/auth/login "$login_payload")"
token="$(printf '%s' "$login_response" | extract_json_string token)"
test -n "$token"
auth_header="Authorization: Bearer ${token}"
echo "login: ok token_prefix=$(printf '%s' "$token" | cut -c 1-8)..."

vault_payload="{\"clientVaultId\":\"${CLIENT_VAULT_ID}\",\"displayName\":\"Smoke Vault\",\"encryptedPayload\":\"payload-cifrado-ficticio-smoke\",\"payloadVersion\":1}"
vault_response="$(request POST /api/vaults "$vault_payload" "$auth_header")"
vault_id="$(printf '%s' "$vault_response" | extract_json_string id)"
test -n "$vault_id"
echo "create vault: ok id=${vault_id}"

vaults_response="$(request GET /api/vaults "" "$auth_header")"
echo "$vaults_response" | grep -q "$CLIENT_VAULT_ID"
echo "$vaults_response" | grep -q "payload-cifrado-ficticio-smoke"
echo "list vaults: ok"

echo "Smoke backend sync completed."

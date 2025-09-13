#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/supabase-set-secrets.sh
# Reads .env.local and pushes the relevant keys to Supabase Edge Functions secrets.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
DOTENV="$ROOT_DIR/.env.local"

if [[ ! -f "$DOTENV" ]]; then
  echo ".env.local not found at $DOTENV" >&2
  exit 1
fi

# Export variables from .env.local (simple parser: ignores comments and empty lines)
set -a
while IFS= read -r line; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  # strip inline comments after a space # ...
  key=${line%%=*}
  val=${line#*=}
  # remove surrounding quotes if present
  if [[ "$val" =~ ^\".*\"$ || "$val" =~ ^\'.*\'$ ]]; then
    val=${val:1:${#val}-2}
  fi
  export "$key"="$val"
done < "$DOTENV"
set +a

echo "Pushing secrets to Supabase Edge Functions..."

# Set both canonical and NEXT_PUBLIC_* names so functions are robust
supabase functions secrets set \
  SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}" \
  NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-}}" \
  SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-}}" \
  SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_ROLE_KEY:-}}" \
  SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}" \
  SPOTIFY_CLIENT_ID="${SPOTIFY_CLIENT_ID:-}" \
  SPOTIFY_CLIENT_SECRET="${SPOTIFY_CLIENT_SECRET:-}" \
  LASTFM_API_KEY="${LASTFM_API_KEY:-}"

echo "Done. Verify in Dashboard → Edge Functions → Secrets."


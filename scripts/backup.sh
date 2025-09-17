#!/usr/bin/env bash
set -euo pipefail

# Load env vars (DATABASE_URL)
if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Add it to .env.local." >&2
  exit 1
fi

# Determine server major version using psql
server_num=$(psql "$DATABASE_URL" -tA -c "SHOW server_version_num;" 2>/dev/null || true)
if [[ -z "$server_num" ]]; then
  echo "Unable to query server version via psql. Ensure psql can connect using DATABASE_URL." >&2
  exit 1
fi
server_major=${server_num:0:2} # e.g. 17 from 170004

# If user specifies a pg_dump binary, use it (and skip detection)
if [[ -n "${PG_DUMP_BIN:-}" ]]; then
  if [[ ! -x "$PG_DUMP_BIN" ]]; then
    echo "PG_DUMP_BIN is set but not executable: $PG_DUMP_BIN" >&2
    exit 1
  fi
  pg_dump_bin="$PG_DUMP_BIN"
else
  # Find a pg_dump whose major version matches the server
choose_pg_dump() {
  local desired_major="$1"
  local candidates=()

  # Prefer Homebrew-provided clients if available
  if command -v brew >/dev/null 2>&1; then
    local brew_prefix
    brew_prefix=$(brew --prefix 2>/dev/null || true)
    [[ -n "$brew_prefix" ]] && candidates+=("$brew_prefix/opt/libpq/bin/pg_dump")
    candidates+=("$brew_prefix/opt/postgresql@${desired_major}/bin/pg_dump")
  fi

  # Common install prefixes
  candidates+=(
    "/opt/homebrew/opt/libpq/bin/pg_dump"
    "/usr/local/opt/libpq/bin/pg_dump"
    "/opt/homebrew/opt/postgresql@${desired_major}/bin/pg_dump"
    "/usr/local/opt/postgresql@${desired_major}/bin/pg_dump"
    "$(command -v pg_dump 2>/dev/null || true)"
  )

  for bin in "${candidates[@]}"; do
    [[ -x "$bin" ]] || continue
    local ver
    ver=$("$bin" --version 2>/dev/null | awk '{print $3}')
    local major
    major=${ver%%.*}
    if [[ "$major" == "$desired_major" ]]; then
      echo "$bin"
      return 0
    fi
  done
  return 1
}

if [[ -z "${pg_dump_bin:-}" ]] && ! pg_dump_bin=$(choose_pg_dump "$server_major"); then
  echo "Could not find a matching pg_dump v${server_major}." >&2
  echo "Fix options:" >&2
  echo "  1) brew install libpq && echo 'export PATH=\"$(brew --prefix)/opt/libpq/bin:$PATH\"' >> ~/.zshrc" >&2
  echo "  2) brew install postgresql@${server_major} and use its pg_dump." >&2
  echo "  3) Or run a Docker pg_dump matching v${server_major} (e.g. image postgres:${server_major}-alpine)." >&2
  exit 1
fi

fi

mkdir -p backups
ts=$(date +%Y%m%d_%H%M%S)
out="backups/backup_${ts}.sql"

echo "Creating backup to ${out} using ${pg_dump_bin}..."
"${pg_dump_bin}" --no-owner --no-privileges "$DATABASE_URL" > "$out"
echo "Backup created: ${out}"

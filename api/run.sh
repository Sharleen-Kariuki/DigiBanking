#!/usr/bin/env sh
set -eu

KIT_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

# Dynamic port assignment for cloud platforms (Render, Heroku, etc.)
PORT="${PORT:-3000}"
export PORT

# Set paths to database and config
export DB_PATH="${DB_PATH:-$KIT_ROOT/data/onboarding.sqlite}"
export CONFIG_PATH="${CONFIG_PATH:-$KIT_ROOT/config.xml}"

# Ensure data directory exists
mkdir -p "$(dirname "$DB_PATH")"

# Locate the Linux onboarding-api binary
if [ -f "$KIT_ROOT/api/onboarding-api" ]; then
  BIN="$KIT_ROOT/api/onboarding-api"
elif [ -f "$KIT_ROOT/linux-x64/onboarding-api" ]; then
  BIN="$KIT_ROOT/linux-x64/onboarding-api"
elif [ -f "/app/api/onboarding-api" ]; then
  BIN="/app/api/onboarding-api"
else
  echo "Error: onboarding-api binary not found in api/ or linux-x64/" >&2
  exit 1
fi

chmod +x "$BIN"

echo "=== Starting DigiBanking Onboarding API ==="
echo "Port:        $PORT"
echo "Database:    $DB_PATH"
echo "Config:      $CONFIG_PATH"
echo "Executable:  $BIN"

exec "$BIN"

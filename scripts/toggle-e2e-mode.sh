#!/usr/bin/env bash
# E2E 무인증 모드 토글 스크립트 (실행은 수동)
# 사용 예:
#   ./scripts/toggle-e2e-mode.sh on  "<SERVICE_ROLE_KEY>"
#   ./scripts/toggle-e2e-mode.sh off

set -euo pipefail
MODE=${1:-}
SERVICE_KEY=${2:-}
DOTENV=.env.local.e2e

if [[ "$MODE" == "on" ]]; then
  if [[ -z "$SERVICE_KEY" ]]; then
    echo "\nUsage: $0 on <SUPABASE_SERVICE_ROLE_KEY>" >&2
    exit 1
  fi
  cat > $DOTENV <<EOF2
E2E_NO_AUTH=1
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
# dev 서버 실행 예: E2E_NO_AUTH=1 SUPABASE_SERVICE_ROLE_KEY=... pnpm dev -p 8000
EOF2
  echo "E2E mode ON. Written $DOTENV"
  echo "👉 dev 다시 시작 후: E2E_NO_AUTH=1 SUPABASE_SERVICE_ROLE_KEY=... pnpm exec playwright test"
elif [[ "$MODE" == "off" ]]; then
  rm -f $DOTENV
  echo "E2E mode OFF. Removed $DOTENV"
  echo "👉 dev 다시 시작해 주세요."
else
  echo "Usage: $0 on <service_key> | off"
  exit 1
fi

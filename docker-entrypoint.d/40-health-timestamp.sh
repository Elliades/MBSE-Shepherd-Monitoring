#!/bin/sh
set -eu
HEALTH=/usr/share/nginx/html/api/health.json
if [ -f "$HEALTH" ]; then
  ts=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
  sed -i "s/\"timestamp\": \"[^\"]*\"/\"timestamp\": \"$ts\"/" "$HEALTH"
fi

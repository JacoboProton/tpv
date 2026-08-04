#!/usr/bin/env bash
set -e
# Health check script used in CI pipelines.
# Reads HEALTH_URL env var or defaults to local Next.js health endpoint.
URL="${HEALTH_URL:-http://localhost:3000/api/health}"
echo "Checking health at $URL"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$STATUS" -ne 200 ]; then
  echo "Health check failed (status $STATUS)"
  exit 1
fi
echo "Health check passed"

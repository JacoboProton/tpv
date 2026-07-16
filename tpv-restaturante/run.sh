#!/bin/bash
set -e

echo "=== Starting TPV ==="
echo

echo "=== Running DB migrations ==="
npm run db:push

echo

echo "=== Opening up "http://localhost:3000" in your browser ==="
echo

echo "=== App initialized ==="

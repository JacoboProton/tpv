#!/usr/bin/env bash
set -e
# Simple rollback script for CI deployments.
# This script attempts to revert the last migration using drizzle-kit.
# Adjust the command if your project uses a different rollback mechanism.

echo "Starting rollback..."
# Try to run a down migration (if supported)
if npx drizzle-kit migrate:down; then
  echo "Rollback completed successfully."
else
  echo "Rollback command failed or not supported. Manual intervention may be required."
  exit 1
fi

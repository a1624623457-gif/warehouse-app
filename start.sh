#!/bin/bash
# Render Start Command
# Init DB (creates tables and seeds if first run)
node scripts/init-db.mjs

# Start Next.js production server
npx next start --port $PORT -H 0.0.0.0

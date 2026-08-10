#!/bin/sh
set -e

# Secreto JWT: exigido por validateEnv en produccion. Si no viene del
# entorno, generamos uno aleatorio por arranque (las sesiones se invalidan
# al reiniciar, aceptable para demo).
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '\n=+/')"
  export JWT_SECRET
  echo "[demo] JWT_SECRET generado automaticamente (las sesiones no sobreviven a un reinicio)"
fi

# CRON_SECRET: lo necesita demo-seed para autenticarse.
if [ -z "$CRON_SECRET" ]; then
  CRON_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '\n=+/')"
  export CRON_SECRET
  echo "[demo] CRON_SECRET generado automaticamente"
fi

npx drizzle-kit push --force

# Arranca el servidor (CMD: node server.js) en background.
"$@" &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' TERM INT HUP

# Cuando el servidor responda, siembra los datos de ejemplo si la BD esta vacia.
node -e "
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const port = process.env.PORT || '3000';
  const base = 'http://127.0.0.1:' + port;
  let ok = false;
  for (let attempts = 0; attempts < 60; attempts++) {
    try {
      const r = await fetch(base + '/api/health');
      if (r.ok) { ok = true; break; }
    } catch {}
    await sleep(1000);
  }
  if (!ok) { console.error('[demo] el servidor no respondio a tiempo, saltando seed'); process.exit(0); }
  const res = await fetch(base + '/api/demo-seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.CRON_SECRET },
  });
  const body = await res.json().catch(() => ({}));
  console.log('[demo] seed ->', res.status, JSON.stringify(body));
  process.exit(0);
})();
"

wait $SERVER_PID
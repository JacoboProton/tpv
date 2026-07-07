const DEVICE_KEY = 'tpv:device_id';

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'web_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function sessionLogin(employeeId, employeeRole) {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', employeeId, employeeRole, deviceId: getDeviceId() }),
  });
  return res.json();
}

export async function sessionLogout(employeeId) {
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout', employeeId, deviceId: getDeviceId() }),
  }).catch(() => {});
}

export async function sessionKeepalive(employeeId) {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'keepalive', employeeId, deviceId: getDeviceId() }),
  });
  return res.json();
}

export function startKeepalive(employeeId, onInvalidated) {
  if (typeof window === 'undefined') return;
  const interval = setInterval(async () => {
    try {
      const data = await sessionKeepalive(employeeId);
      if (data.invalidated) {
        clearInterval(interval);
        onInvalidated?.();
      }
    } catch {}
  }, 30000);
  return () => clearInterval(interval);
}

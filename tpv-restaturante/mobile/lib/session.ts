import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_KEY = 'tpv:device_id';

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'mobile_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function sessionLogin(employeeId: string, employeeRole: string, force = false): Promise<{ ok?: boolean; conflict?: boolean; message?: string }> {
  const deviceId = await getDeviceId();
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', employeeId, employeeRole, deviceId, force }),
  });
  return res.json();
}

export async function sessionLogout(employeeId: string): Promise<void> {
  const deviceId = await getDeviceId();
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout', employeeId, deviceId }),
  }).catch(() => {});
}

export async function sessionKeepalive(employeeId: string): Promise<{ ok?: boolean; invalidated?: boolean; message?: string }> {
  const deviceId = await getDeviceId();
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'keepalive', employeeId, deviceId }),
  });
  return res.json();
}

export function startKeepalive(employeeId: string, onInvalidated: () => void): () => void {
  const interval = setInterval(async () => {
    try {
      const data = await sessionKeepalive(employeeId);
      if (data.invalidated) {
        clearInterval(interval);
        onInvalidated();
      }
    } catch {}
  }, 30000);
  return () => clearInterval(interval);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, TPV_API_KEY } from './config';

const DEVICE_KEY = 'tpv:device_id';

async function apiHeaders() {
  const tenant = await AsyncStorage.getItem('tpv:tenant');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenant || 'default',
  };
  if (TPV_API_KEY) headers['x-tpv-key'] = TPV_API_KEY;
  return headers;
}

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
  const res = await fetch(`${API_URL}/api/session`, {
    method: 'POST',
    headers: await apiHeaders(),
    body: JSON.stringify({ action: 'login', employeeId, employeeRole, deviceId, force }),
  });
  return res.json();
}

export async function sessionLogout(employeeId: string): Promise<void> {
  const deviceId = await getDeviceId();
  await fetch(`${API_URL}/api/session`, {
    method: 'POST',
    headers: await apiHeaders(),
    body: JSON.stringify({ action: 'logout', employeeId, deviceId }),
  }).catch(() => {});
}

export async function sessionKeepalive(employeeId: string): Promise<{ ok?: boolean; invalidated?: boolean; message?: string }> {
  const deviceId = await getDeviceId();
  const res = await fetch(`${API_URL}/api/session`, {
    method: 'POST',
    headers: await apiHeaders(),
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

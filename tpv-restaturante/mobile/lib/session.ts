import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, TPV_API_KEY } from './config';
import { logError, logWarn, logInfo, logDebug } from './logger';

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
  try {
    let id = await AsyncStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = 'mobile_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
      await AsyncStorage.setItem(DEVICE_KEY, id);
      logInfo('Generated new device ID', { deviceId: id });
    } else {
      logDebug('Using existing device ID', { deviceId: id });
    }
    return id;
  } catch (e) {
    logError('Failed to get/generate device ID', { error: e });
    // Fallback: generar ID temporal sin persistencia
    return 'mobile_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
  }
}

export async function sessionLogin(employeeId: string, employeeRole: string, force = false): Promise<{ ok?: boolean; conflict?: boolean; message?: string }> {
  const deviceId = await getDeviceId();
  logInfo('Session login attempt', { employeeId, employeeRole, force, deviceId });
  
  try {
    const res = await fetch(`${API_URL}/api/session`, {
      method: 'POST',
      headers: await apiHeaders(),
      body: JSON.stringify({ action: 'login', employeeId, employeeRole, deviceId, force }),
    });
    const data = await res.json();
    
    if (data.ok) {
      logInfo('Session login successful', { employeeId, employeeRole });
    } else if (data.conflict) {
      logWarn('Session login conflict detected', { employeeId, employeeRole, message: data.message });
    } else {
      logError('Session login failed', { employeeId, employeeRole, message: data.message });
    }
    
    return data;
  } catch (e) {
    logError('Session login request failed', { error: e, employeeId, employeeRole });
    throw e;
  }
}

export async function sessionLogout(employeeId: string): Promise<void> {
  const deviceId = await getDeviceId();
  logInfo('Session logout attempt', { employeeId, deviceId });
  
  try {
    await fetch(`${API_URL}/api/session`, {
      method: 'POST',
      headers: await apiHeaders(),
      body: JSON.stringify({ action: 'logout', employeeId, deviceId }),
    });
    logInfo('Session logout successful', { employeeId });
  } catch (e) {
    logWarn('Session logout request failed (non-critical)', { error: e, employeeId });
    // No throw porque logout es "best-effort"
  }
}

export async function sessionKeepalive(employeeId: string): Promise<{ ok?: boolean; invalidated?: boolean; message?: string }> {
  const deviceId = await getDeviceId();
  
  try {
    const res = await fetch(`${API_URL}/api/session`, {
      method: 'POST',
      headers: await apiHeaders(),
      body: JSON.stringify({ action: 'keepalive', employeeId, deviceId }),
    });
    const data = await res.json();
    
    if (data.invalidated) {
      logWarn('Session invalidated by server', { employeeId, message: data.message });
    } else if (!data.ok) {
      logWarn('Session keepalive failed', { employeeId, message: data.message });
    } else {
      logDebug('Session keepalive successful', { employeeId });
    }
    
    return data;
  } catch (e) {
    logError('Session keepalive request failed', { error: e, employeeId });
    throw e;
  }
}

export function startKeepalive(employeeId: string, onInvalidated: () => void): () => void {
  logInfo('Starting session keepalive', { employeeId, interval: 30000 });
  
  const interval = setInterval(async () => {
    try {
      const data = await sessionKeepalive(employeeId);
      if (data.invalidated) {
        logInfo('Session invalidated, stopping keepalive', { employeeId });
        clearInterval(interval);
        onInvalidated();
      }
    } catch (e) {
      logError('Keepalive request failed, will retry next interval', { error: e, employeeId });
    }
  }, 30000);
  
  return () => {
    logInfo('Stopping session keepalive', { employeeId });
    clearInterval(interval);
  };
}

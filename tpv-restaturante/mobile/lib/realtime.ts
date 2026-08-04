import { Alert, Platform } from 'react-native';
import { RealtimeClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';
import type { Floor } from './types';
import { logError, logWarn, logInfo, logDebug } from './logger';
import { getLastFloor, computeFloorDiff, getEmployeeId, getEmployeeRole, getDeviceId, fetchRealtimeToken } from './api';

let client: RealtimeClient | null = null;
let channel: any = null;

async function authenticateClient(c: RealtimeClient) {
  try {
    const { token } = await fetchRealtimeToken();
    c.setAuth(token);
    logInfo('Mobile realtime connection authenticated with JWT');
  } catch (e) {
    logError('Failed to authenticate mobile realtime client', { error: e });
  }
}

export function applyFloorDiff(current: any, payload: any): any {
  if (!current || payload.isFullSync !== false) {
    return payload.floor;
  }
  const diff = payload.diff;
  if (!diff) return current;

  const updatedTables = diff.updatedTables || [];
  const deletedTableIds = diff.deletedTableIds || [];
  const updatedOrders = diff.updatedOrders || {};
  const deletedOrderIds = diff.deletedOrderIds || [];

  const updatedTablesMap = new Map(updatedTables.map((t: any) => [t.id, t]));
  const deletedTablesSet = new Set(deletedTableIds);
  const newTables = (current.tables || [])
    .filter((t: any) => !deletedTablesSet.has(t.id))
    .map((t: any) => updatedTablesMap.get(t.id) || t);

  const newOrders = { ...(current.orders || {}) };
  for (const [oid, o] of Object.entries(updatedOrders)) {
    newOrders[oid] = o;
  }
  for (const oid of deletedOrderIds) {
    delete newOrders[oid];
  }

  return {
    ...current,
    tables: newTables,
    orders: newOrders,
    vectorClock: payload.vectorClock ?? current.vectorClock,
    updatedAt: payload.updatedAt ?? current.updatedAt,
  };
}

export function connectRealtime(
  onFloorUpdate: (updater: any) => void,
  onReadyNotification?: (data: { tableName: string; itemNames: string[]; waiterName?: string }) => void,
  tenantId?: string,
) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logWarn('Supabase credentials not configured, realtime disabled');
    return null;
  }

  const endpoint = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1';
  const channelName = `floor-sync:${tenantId || 'default'}`;
  
  logInfo('Connecting to Supabase Realtime', { endpoint, channelName, tenantId });

  try {
    client = new RealtimeClient(endpoint, {
      params: { apikey: SUPABASE_KEY },
      reconnectAfterMs: (tries) => {
        const base = 1000;
        const max = 30000;
        const exponential = base * Math.pow(2, tries - 1);
        const jitter = Math.random() * 1000;
        return Math.min(exponential + jitter, max);
      }
    });

    channel = client.channel(channelName);
    
    channel.on('presence', { event: 'sync' }, () => {
      logDebug('Presence sync received', { presenceState: channel.presenceState() });
    });

    channel.on('broadcast', { event: 'floor:updated' }, ({ payload }: { payload: any }) => {
      logDebug('Floor update received via realtime', { channelName });
      onFloorUpdate((prev: Floor | null) => applyFloorDiff(prev, payload));
    });

    channel.on('broadcast', { event: 'ready:notification' }, ({ payload }: { payload: { tableName: string; itemNames: string[]; waiterName?: string } }) => {
      logDebug('Ready notification received via realtime', { channelName });
      if (onReadyNotification) onReadyNotification(payload);
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        const employeeId = getEmployeeId() || 'anonymous';
        const role = getEmployeeRole() || 'unknown';
        const deviceId = getDeviceId() || 'mobile-device';
        
        channel.track({
          employeeId,
          role,
          deviceId,
          onlineAt: new Date().toISOString(),
        }).catch((err: any) => logError('Presence track failed', { error: err }));
      }
    });

    client.connect();
    authenticateClient(client);

    logInfo('Connected to Supabase Realtime successfully', { channelName });
    return channel;
  } catch (e) {
    logError('Failed to connect to Supabase Realtime', { error: e, endpoint, channelName });
    return null;
  }
}

export function showReadyNotification(data: { tableName: string; itemNames: string[]; waiterName?: string }) {
  const items = data.itemNames.slice(0, 3).join(', ');
  const suffix = data.itemNames.length > 3 ? ` y ${data.itemNames.length - 3} más` : '';
  const msg = `${data.tableName}: ${items}${suffix}`;
  
  logInfo('Showing ready notification', { tableName: data.tableName, itemCount: data.itemNames.length });
  
  if (Platform.OS === 'web') {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🍽️ Plato listo', { body: msg });
    }
  }
  Alert.alert('🍽️ Plato listo', msg);
}

export function broadcastFloorUpdate(floor: Floor, _tenantId?: string) {
  if (!channel) {
    logWarn('Cannot broadcast floor update: not connected to realtime');
    return;
  }
  
  try {
    const last = getLastFloor();
    const diff = computeFloorDiff(last, floor);

    if (diff.isFullSync) {
      channel.send({
        type: 'broadcast',
        event: 'floor:updated',
        payload: {
          isFullSync: true,
          floor,
        },
      });
    } else {
      channel.send({
        type: 'broadcast',
        event: 'floor:updated',
        payload: {
          isFullSync: false,
          diff,
          vectorClock: (floor as any).vectorClock,
          updatedAt: (floor as any).updatedAt,
        },
      });
    }
    logDebug('Floor update broadcasted', { tableCount: floor.tables?.length, orderCount: Object.keys(floor.orders || {}).length });
  } catch (e) {
    logError('Failed to broadcast floor update', { error: e });
  }
}

export function disconnectRealtime() {
  logInfo('Disconnecting from Supabase Realtime');
  
  try {
    if (channel) {
      channel.unsubscribe();
      channel = null;
    }
    if (client) {
      client.disconnect();
      client = null;
    }
    logInfo('Disconnected from Supabase Realtime successfully');
  } catch (e) {
    logError('Error during realtime disconnect', { error: e });
  }
}

import { Alert, Platform } from 'react-native';
import { RealtimeClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';
import type { Floor } from './types';
import { logError, logWarn, logInfo, logDebug } from './logger';

let client: RealtimeClient | null = null;
// Supabase RealtimeChannel type no está exportado directamente, usamos any con cuidado
let channel: any = null;

export function connectRealtime(
  onFloorUpdate: (floor: Floor) => void,
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
    });

    channel = client.channel(channelName);
    channel.on('broadcast', { event: 'floor:updated' }, ({ payload }: { payload: { floor: Floor } }) => {
      logDebug('Floor update received via realtime', { channelName });
      onFloorUpdate(payload.floor);
    });
    channel.on('broadcast', { event: 'ready:notification' }, ({ payload }: { payload: { tableName: string; itemNames: string[]; waiterName?: string } }) => {
      logDebug('Ready notification received via realtime', { channelName });
      if (onReadyNotification) onReadyNotification(payload);
    });
    channel.subscribe();
    client.connect();

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
    channel.send({
      type: 'broadcast',
      event: 'floor:updated',
      payload: { floor },
    });
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

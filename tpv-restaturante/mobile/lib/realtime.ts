import { Alert, Platform } from 'react-native';
import { RealtimeClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';
import type { Floor } from './types';

let client: RealtimeClient | null = null;
let channel: any = null;

export function connectRealtime(
  onFloorUpdate: (floor: Floor) => void,
  onReadyNotification?: (data: { tableName: string; itemNames: string[]; waiterName?: string }) => void,
) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const endpoint = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1';

  client = new RealtimeClient(endpoint, {
    params: { apikey: SUPABASE_KEY },
  });

  channel = client.channel('floor-sync');
  channel.on('broadcast', { event: 'floor:updated' }, ({ payload }: any) => {
    onFloorUpdate(payload.floor);
  });
  channel.on('broadcast', { event: 'ready:notification' }, ({ payload }: any) => {
    if (onReadyNotification) onReadyNotification(payload);
  });
  channel.subscribe();
  client.connect();

  return channel;
}

export function showReadyNotification(data: { tableName: string; itemNames: string[]; waiterName?: string }) {
  const items = data.itemNames.slice(0, 3).join(', ');
  const suffix = data.itemNames.length > 3 ? ` y ${data.itemNames.length - 3} más` : '';
  const msg = `${data.tableName}: ${items}${suffix}`;
  if (Platform.OS === 'web') {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🍽️ Plato listo', { body: msg });
    }
  }
  Alert.alert('🍽️ Plato listo', msg);
}

export function broadcastFloorUpdate(floor: Floor) {
  if (!channel) return;
  channel.send({
    type: 'broadcast',
    event: 'floor:updated',
    payload: { floor },
  });
}

export function disconnectRealtime() {
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
  if (client) {
    client.disconnect();
    client = null;
  }
}

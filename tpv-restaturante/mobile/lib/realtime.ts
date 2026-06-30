import { RealtimeClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';
import type { Floor } from './types';

let client: RealtimeClient | null = null;
let channel: any = null;

export function connectRealtime(onFloorUpdate: (floor: Floor) => void) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const endpoint = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1';

  client = new RealtimeClient(endpoint, {
    params: { apikey: SUPABASE_KEY },
  });

  channel = client.channel('floor-sync');
  channel.on('broadcast', { event: 'floor:updated' }, ({ payload }: any) => {
    onFloorUpdate(payload.floor);
  });
  channel.subscribe();
  client.connect();

  return channel;
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

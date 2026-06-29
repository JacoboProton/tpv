import { RealtimeClient } from '@supabase/supabase-js';

let client = null;
let channel = null;
let unsub = null;

function getRealtimeUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return url.replace('https://', 'wss://') + '/realtime/v1';
}

export function connectRealtime() {
  if (channel) return channel;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const endpoint = getRealtimeUrl();
  if (!endpoint || !key) return null;

  client = new RealtimeClient(endpoint, {
    params: { apikey: key },
  });
  channel = client.channel('floor-sync');
  channel.subscribe();
  client.connect();
  return channel;
}

export function broadcastFloorUpdate(floor) {
  if (!channel) return;
  channel.send({
    type: 'broadcast',
    event: 'floor:updated',
    payload: { floor },
  });
}

export function onFloorUpdate(callback) {
  if (!channel) return () => {};
  unsub = channel.on('broadcast', { event: 'floor:updated' }, ({ payload }) => {
    callback(payload.floor);
  });
  return () => { unsub?.(); };
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

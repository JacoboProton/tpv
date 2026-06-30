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

export async function broadcastFloorUpdateServer(floor) {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key) return;
  const endpoint = url.replace('https://', 'wss://') + '/realtime/v1';
  const c = new RealtimeClient(endpoint, { params: { apikey: key } });
  const ch = c.channel('floor-sync');
  c.connect();
  await new Promise(resolve => {
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.send({ type: 'broadcast', event: 'floor:updated', payload: { floor } });
        setTimeout(() => { ch.unsubscribe(); c.disconnect(); resolve(); }, 100);
      }
    });
  });
}

export function broadcastReadyNotification(tableName, itemNames, waiterName) {
  if (!channel) return;
  channel.send({
    type: 'broadcast',
    event: 'ready:notification',
    payload: { tableName, itemNames, waiterName, time: Date.now() },
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

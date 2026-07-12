import { RealtimeClient } from '@supabase/supabase-js';

let client = null;
let channel = null;
let unsub = null;

let serverClient = null;
const serverChannels = {};

function getRealtimeUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return url.replace('https://', 'wss://') + '/realtime/v1';
}

function getServerClient() {
  if (serverClient) return serverClient;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const endpoint = getRealtimeUrl();
  if (!endpoint || !key) return null;
  serverClient = new RealtimeClient(endpoint, { params: { apikey: key } });
  serverClient.connect();
  return serverClient;
}

export function connectRealtime(tenantId) {
  if (channel) return channel;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const endpoint = getRealtimeUrl();
  if (!endpoint || !key) return null;

  const tid = tenantId || 'default';
  client = new RealtimeClient(endpoint, {
    params: { apikey: key },
  });
  channel = client.channel(`floor-sync:${tid}`);
  channel.subscribe();
  client.connect();
  return channel;
}

export function broadcastFloorUpdate(floor, tenantId) {
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

export async function broadcastFloorUpdateServer(floor, tenantId) {
  const c = getServerClient();
  if (!c) return;
  const tid = tenantId || 'default';

  let ch = serverChannels[tid];
  if (!ch) {
    ch = c.channel(`floor-sync:${tid}`);
    serverChannels[tid] = ch;
    await new Promise(resolve => {
      ch.subscribe(status => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
  }

  ch.send({ type: 'broadcast', event: 'floor:updated', payload: { floor } });
}

export function broadcastReadyNotification(tableName, itemNames, waiterName, tenantId) {
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
  for (const ch of Object.values(serverChannels)) {
    ch.unsubscribe();
  }
  Object.keys(serverChannels).forEach(k => delete serverChannels[k]);
  if (serverClient) {
    serverClient.disconnect();
    serverClient = null;
  }
}

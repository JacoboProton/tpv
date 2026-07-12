import { RealtimeClient } from '@supabase/supabase-js';

let client = null;
let channel = null;
let unsub = null;
const clientChannels = {};

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

function getClientInstance() {
  if (client) return client;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const endpoint = getRealtimeUrl();
  if (!endpoint || !key) return null;
  client = new RealtimeClient(endpoint, { params: { apikey: key } });
  client.connect();
  return client;
}

function getClientChannel(tenantId) {
  const tid = tenantId || 'default';
  if (clientChannels[tid]) return clientChannels[tid];
  const c = getClientInstance();
  if (!c) return null;
  const ch = c.channel(`floor-sync:${tid}`);
  ch.subscribe();
  clientChannels[tid] = ch;
  return ch;
}

export function connectRealtime(tenantId) {
  if (channel) return channel;
  const tid = tenantId || 'default';
  const c = getClientInstance();
  if (!c) return null;

  if (!clientChannels[tid]) {
    const ch = c.channel(`floor-sync:${tid}`);
    ch.subscribe();
    clientChannels[tid] = ch;
  }
  channel = clientChannels[tid];
  return channel;
}

export function broadcastFloorUpdate(floor, tenantId) {
  const ch = getClientChannel(tenantId);
  if (!ch) return;
  ch.send({
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
  const ch = getClientChannel(tenantId);
  if (!ch) return;
  ch.send({
    type: 'broadcast',
    event: 'ready:notification',
    payload: { tableName, itemNames, waiterName, time: Date.now() },
  });
}

export function disconnectRealtime() {
  for (const ch of Object.values(clientChannels)) {
    ch.unsubscribe();
  }
  Object.keys(clientChannels).forEach(k => delete clientChannels[k]);
  if (client) {
    client.disconnect();
    client = null;
  }
  channel = null;
  unsub = null;
  for (const ch of Object.values(serverChannels)) {
    ch.unsubscribe();
  }
  Object.keys(serverChannels).forEach(k => delete serverChannels[k]);
  if (serverClient) {
    serverClient.disconnect();
    serverClient = null;
  }
}

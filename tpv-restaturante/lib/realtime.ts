import { RealtimeClient, RealtimeChannel } from '@supabase/supabase-js';

let client: RealtimeClient | null = null;
let channel: RealtimeChannel | null = null;
let unsub: (() => void) | null = null;
const clientChannels: Record<string, RealtimeChannel> = {};

let serverClient: RealtimeClient | null = null;
const serverChannels: Record<string, RealtimeChannel> = {};

function getRealtimeUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return url.replace('https://', 'wss://') + '/realtime/v1';
}

function getServerClient(): RealtimeClient | null {
  if (serverClient) return serverClient;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const endpoint = getRealtimeUrl();
  if (!endpoint || !key) return null;
  serverClient = new RealtimeClient(endpoint, { params: { apikey: key } });
  serverClient.connect();
  return serverClient;
}

function getClientInstance(): RealtimeClient | null {
  if (client) return client;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const endpoint = getRealtimeUrl();
  if (!endpoint || !key) return null;
  client = new RealtimeClient(endpoint, { params: { apikey: key } });
  client.connect();
  return client;
}

function getClientChannel(tenantId?: string): RealtimeChannel | null {
  const tid = tenantId || 'default';
  if (clientChannels[tid]) return clientChannels[tid];
  const c = getClientInstance();
  if (!c) return null;
  const ch = c.channel(`floor-sync:${tid}`);
  ch.subscribe();
  clientChannels[tid] = ch;
  return ch;
}

export function connectRealtime(tenantId?: string): RealtimeChannel | null {
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

export function broadcastFloorUpdate(floor: unknown, tenantId?: string): void {
  const ch = getClientChannel(tenantId);
  if (!ch) return;
  ch.send({
    type: 'broadcast',
    event: 'floor:updated',
    payload: { floor },
  });
}

export function onFloorUpdate(callback: (floor: unknown) => void): () => void {
  if (!channel) return () => {};
  unsub = channel.on('broadcast', { event: 'floor:updated' }, ({ payload }: { payload: { floor: unknown } }) => {
    callback(payload.floor);
  }) as unknown as () => void;
  return () => { unsub?.(); };
}

export async function broadcastFloorUpdateServer(floor: unknown, tenantId?: string): Promise<void> {
  const c = getServerClient();
  if (!c) return;
  const tid = tenantId || 'default';

  let ch = serverChannels[tid];
  if (!ch) {
    ch = c.channel(`floor-sync:${tid}`);
    serverChannels[tid] = ch;
    await new Promise<void>(resolve => {
      ch.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
  }

  ch.send({ type: 'broadcast', event: 'floor:updated', payload: { floor } });
}

export function broadcastReadyNotification(
  tableName: string,
  itemNames: string[],
  waiterName: string,
  tenantId?: string
): void {
  const ch = getClientChannel(tenantId);
  if (!ch) return;
  ch.send({
    type: 'broadcast',
    event: 'ready:notification',
    payload: { tableName, itemNames, waiterName, time: Date.now() },
  });
}

export function disconnectRealtime(): void {
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

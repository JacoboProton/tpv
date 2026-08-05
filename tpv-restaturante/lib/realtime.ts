import { RealtimeClient, RealtimeChannel } from '@supabase/supabase-js';
import { getLastFloor, computeFloorDiff } from './api';

let client: RealtimeClient | null = null;
let channel: RealtimeChannel | null = null;
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

async function authenticateClient(c: RealtimeClient) {
  try {
    const res = await fetch('/api/realtime/token');
    if (res.ok) {
      const { token } = await res.json();
      c.setAuth(token);
      console.log('Realtime client authenticated with JWT');
    }
  } catch (err) {
    console.error('Failed to authenticate Realtime connection:', err);
  }
}

function getClientInstance(): RealtimeClient | null {
  if (client) return client;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const endpoint = getRealtimeUrl();
  if (!endpoint || !key) return null;
  
  // Reconnection with backoff
  client = new RealtimeClient(endpoint, {
    params: { apikey: key },
    reconnectAfterMs: (tries) => {
      const base = 1000;
      const max = 30000;
      const exponential = base * Math.pow(2, tries - 1);
      const jitter = Math.random() * 1000;
      return Math.min(exponential + jitter, max);
    }
  });

  client.connect();
  authenticateClient(client);
  
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
    
    ch.on('presence', { event: 'sync' }, () => {
      console.log('Presence sync:', ch.presenceState());
    });

    ch.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        const employeeId = typeof window !== 'undefined' ? (window.__employeeId || localStorage.getItem('tpv:current_user') || 'anonymous') : 'server';
        const role = typeof window !== 'undefined' ? (window.__employeeRole || 'unknown') : 'server';
        const deviceId = typeof window !== 'undefined' ? (localStorage.getItem('tpv:device_id') || 'unknown') : 'server';
        
        ch.track({
          employeeId,
          role,
          deviceId,
          onlineAt: new Date().toISOString(),
        }).catch(err => console.error('Presence track failed:', err));
      }
    });

    clientChannels[tid] = ch;
  }
  channel = clientChannels[tid];
  return channel;
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

export function broadcastFloorUpdate(floor: unknown, tenantId?: string): void {
  const ch = getClientChannel(tenantId);
  if (!ch) return;
  
  const last = getLastFloor();
  const next = floor as Record<string, unknown>;
  const diff = computeFloorDiff(last, next);

  if (diff.isFullSync) {
    ch.send({
      type: 'broadcast',
      event: 'floor:updated',
      payload: {
        isFullSync: true,
        floor,
      },
    });
  } else {
    ch.send({
      type: 'broadcast',
      event: 'floor:updated',
      payload: {
        isFullSync: false,
        diff,
        vectorClock: next.vectorClock,
        updatedAt: next.updatedAt,
      },
    });
  }
}

export function onFloorUpdate(callback: (payload: any) => void): () => void {
  if (!channel) return () => {};
  channel.on('broadcast', { event: 'floor:updated' }, ({ payload }: { payload: any }) => {
    callback(payload);
  });
  return () => {};
}

export async function broadcastFloorUpdateServer(
  payload: {
    isFullSync: boolean;
    floor?: unknown;
    diff?: unknown;
    vectorClock?: Record<string, number>;
    updatedAt?: number;
  },
  tenantId?: string
): Promise<void> {
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

  ch.send({ type: 'broadcast', event: 'floor:updated', payload });
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
  for (const ch of Object.values(serverChannels)) {
    ch.unsubscribe();
  }
  Object.keys(serverChannels).forEach(k => delete serverChannels[k]);
  if (serverClient) {
    serverClient.disconnect();
    serverClient = null;
  }
}

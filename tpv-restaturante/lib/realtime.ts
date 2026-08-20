import { RealtimeClient, RealtimeChannel } from '@supabase/supabase-js';
import { getLastFloor, computeFloorDiff, type FloorDiff } from './api';
import type { Floor, Order, Table } from '../domain/types';

let client: RealtimeClient | null = null;
let channel: RealtimeChannel | null = null;
const clientChannels: Record<string, RealtimeChannel> = {};

let serverClient: RealtimeClient | null = null;
const serverChannels: Record<string, RealtimeChannel> = {};

export interface SyncFloor extends Floor {
  vectorClock?: Record<string, number>;
  updatedAt?: number;
}

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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isUnknownArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isSyncFloor(v: unknown): v is SyncFloor {
  return isRecord(v) && isUnknownArray(v.tables) && isRecord(v.orders);
}

function isTable(v: unknown): v is Table {
  return isRecord(v) && typeof v.id === 'string' && typeof v.status === 'string';
}

function isOrder(v: unknown): v is Order {
  return isRecord(v) && typeof v.id === 'string' && isUnknownArray(v.items);
}

async function authenticateClient(c: RealtimeClient) {
  try {
    const res = await fetch('/api/realtime/token');
    if (res.ok) {
      const data: unknown = await res.json();
      if (isRecord(data) && typeof data.token === 'string') c.setAuth(data.token);
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
        }).catch((err: unknown) => console.error('Presence track failed:', err));
      }
    });

    clientChannels[tid] = ch;
  }
  channel = clientChannels[tid];
  return channel;
}

export interface FloorUpdatePayload {
  isFullSync?: boolean;
  floor?: unknown;
  diff?: Partial<FloorDiff> | null;
  vectorClock?: Record<string, number>;
  updatedAt?: number;
  updatedTables?: unknown[];
  deletedTableIds?: unknown[];
  updatedOrders?: Record<string, unknown>;
  deletedOrderIds?: unknown[];
}

export function applyFloorDiff(current: SyncFloor | null | undefined, payload: FloorUpdatePayload): SyncFloor | null {
  if (!current || payload.isFullSync !== false) {
    return isSyncFloor(payload.floor) ? payload.floor : null;
  }
  const diff = payload.diff;
  if (!diff) return current;

  const updatedTables = diff.updatedTables || [];
  const deletedTableIds = diff.deletedTableIds || [];
  const updatedOrders = diff.updatedOrders || {};
  const deletedOrderIds = diff.deletedOrderIds || [];

  const updatedTablesMap = new Map<string, Table>();
  for (const t of updatedTables) {
    if (isTable(t)) updatedTablesMap.set(t.id, t);
  }
  const deletedTablesSet = new Set<string>();
  for (const id of deletedTableIds) {
    if (typeof id === 'string') deletedTablesSet.add(id);
  }
  const newTables = (current.tables || [])
    .filter((t) => !deletedTablesSet.has(t.id))
    .map((t) => updatedTablesMap.get(t.id) || t);

  const newOrders: Record<string, Order> = { ...(current.orders || {}) };
  for (const [oid, o] of Object.entries(updatedOrders)) {
    if (isOrder(o)) newOrders[oid] = o;
  }
  for (const oid of deletedOrderIds) {
    if (typeof oid === 'string') delete newOrders[oid];
  }

  return {
    ...current,
    tables: newTables,
    orders: newOrders,
    vectorClock: payload.vectorClock ?? current.vectorClock,
    updatedAt: payload.updatedAt ?? current.updatedAt,
  };
}

export function broadcastFloorUpdate(floor: SyncFloor, tenantId?: string): void {
  const ch = getClientChannel(tenantId);
  if (!ch) return;

  const last = getLastFloor();
  const diff = computeFloorDiff(last, floor);

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
        vectorClock: floor.vectorClock,
        updatedAt: floor.updatedAt,
      },
    });
  }
}

export function onFloorUpdate(callback: (payload: FloorUpdatePayload) => void): () => void {
  if (!channel) return () => {};
  channel.on('broadcast', { event: 'floor:updated' }, ({ payload }: { payload: FloorUpdatePayload }) => {
    callback(payload);
  });
  return () => {};
}

export async function broadcastFloorUpdateServer(
  payload: FloorUpdatePayload,
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
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, X, Search, Loader2, Calendar, Clock } from 'lucide-react';
import type { Theme } from './constants';

type RequestStatus = 'pending' | 'approved' | 'rejected';
type StatusTabKey = 'todas' | RequestStatus;

interface TimeOffRequest {
  id: string;
  employeeName: string;
  reason: string;
  fromDate: string;
  toDate: string;
  status: RequestStatus;
  createdAt: number;
  notes?: string;
  resolvedNote?: string;
}

interface SolicitudesViewProps {
  colors: Theme;
}

interface RequestCardProps {
  request: TimeOffRequest;
  days: number;
  onApprove: (note: string) => void;
  onReject: (note: string) => void;
  C: Theme;
}

const STATUS_KEYS: StatusTabKey[] = ['todas', 'pending', 'approved', 'rejected'];
const STATUS_LABELS: Record<string, string> = { todas: 'Todas', pending: 'Pendientes', approved: 'Aprobadas', rejected: 'Rechazadas' };
const STATUS_COLORS: Record<RequestStatus, string> = { pending: '#c4a04a', approved: '#7a9a7c', rejected: '#b05e5e' };
const REASONS = ['vacaciones', 'asunto personal', 'baja médica', 'permiso', 'otro'];

export default function SolicitudesView({ colors: C }: SolicitudesViewProps) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTabKey>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const r = await fetch('/api/time-off-requests');
      if (r.ok) setRequests(await r.json() as TimeOffRequest[]);
    } catch {}
    setLoading(false);
  }

  async function handleResolve(id: string, status: RequestStatus, resolvedNote: string) {
    try {
      await fetch('/api/time-off-requests', {
        method: 'POST',
        body: JSON.stringify({ action: 'resolve', id, status, resolvedBy: 'admin', resolvedNote }),
      });
      loadRequests();
    } catch {}
  }

  const filtered = useMemo(() => {
    let list = requests;
    if (statusTab !== 'todas') list = list.filter(r => r.status === statusTab);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => r.employeeName.toLowerCase().includes(q));
    }
    return list;
  }, [requests, statusTab, searchTerm]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.cream }}>Solicitudes</h2>
        {pendingCount > 0 && (
          <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: C.brass + '30', color: C.brassLight }}>
            {pendingCount} pendientes
          </span>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b pb-2" style={{ borderColor: C.line }}>
        {STATUS_KEYS.map(sk => (
          <button key={sk} onClick={() => setStatusTab(sk)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: statusTab === sk ? C.surfaceLight : 'transparent', color: statusTab === sk ? C.brassLight : C.muted }}>
            {STATUS_LABELS[sk]}
            {sk === 'pending' && pendingCount > 0 && (
              <span className="ml-1 text-[9px] px-1 py-px rounded-full" style={{ background: C.brass + '30', color: C.brassLight }}>{pendingCount}</span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: C.muted }} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar empleado…"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, paddingLeft: '1.5rem' }}
            className="rounded-lg px-3 py-1.5 text-xs w-40" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: C.muted }}>Sin solicitudes</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const days = Math.round(
              (new Date(r.toDate + 'T23:59').getTime() - new Date(r.fromDate + 'T00:00').getTime()) / 86400000
            ) + 1;
            return (
              <RequestCard key={r.id} request={r} days={days}
                onApprove={(note: string) => handleResolve(r.id, 'approved', note)}
                onReject={(note: string) => handleResolve(r.id, 'rejected', note)}
                C={C} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function RequestCard({ request: r, days, onApprove, onReject, C }: RequestCardProps) {
  const [showActions, setShowActions] = useState(r.status === 'pending');
  const [note, setNote] = useState('');
  const statusColor = STATUS_COLORS[r.status] || C.muted;

  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: C.surfaceLight, borderLeft: `4px solid ${statusColor}` }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm" style={{ color: C.cream }}>{r.employeeName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: statusColor + '30', color: statusColor }}>
              {STATUS_LABELS[r.status]}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: C.muted }}>{r.reason}</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded" style={{ background: C.surface, color: C.muted }}>
          {days} {days === 1 ? 'día' : 'días'}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1" style={{ color: C.brassLight }}>
          <Calendar className="w-3 h-3" /> {r.fromDate} → {r.toDate}
        </span>
        <span className="flex items-center gap-1" style={{ color: C.muted }}>
          <Clock className="w-3 h-3" /> {new Date(r.createdAt).toLocaleDateString('es-ES')}
        </span>
      </div>

      {r.notes && <p className="text-[10px]" style={{ color: C.muted }}>{r.notes}</p>}
      {r.resolvedNote && <p className="text-[10px]" style={{ color: C.muted }}>Nota: {r.resolvedNote}</p>}

      {showActions && (
        <div className="space-y-2 pt-1">
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Nota opcional al resolver…"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
            className="w-full rounded-lg px-3 py-2 text-xs" />
          <div className="flex gap-2">
            <button onClick={() => { onApprove(note); setShowActions(false); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium hover:opacity-80"
              style={{ background: C.sage + '30', color: C.sage }}>
              <Check className="w-3.5 h-3.5" /> Aprobar
            </button>
            <button onClick={() => { onReject(note); setShowActions(false); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium hover:opacity-80"
              style={{ background: C.wine + '30', color: C.wineLight }}>
              <X className="w-3.5 h-3.5" /> Rechazar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Ticket, Loader2, Download, Search, Printer, Mail, MessageCircle, Send, X } from 'lucide-react';
import { buildTicketHtml, printTicketHtml } from '../../lib/ticket-template';
import { apiFetch, unpackList } from '../../lib/api';
import { euros } from '@/components/constants';
import type { Theme } from '@/components/constants';
import type { TicketSettings } from '@tpv/core';
import { useSales, useUi } from '@/modules/core/app-contexts';

interface TicketItem {
  name: string;
  price: number;
  qty: number;
  voided?: boolean;
}

interface TicketSale {
  id: string;
  closedAt: number;
  paymentMethod?: string;
  tableName?: string;
  employeeName?: string;
  total: number;
  items?: TicketItem[];
  ticketNumber?: number;
  discountAmount?: number;
  tip?: number;
  tipMethod?: string;
  totalWithTip?: number;
  invoiceEmail?: string;
  invoicePhone?: string;
}

export interface TicketsViewProps {
  sales?: TicketSale[];
  colors: Theme;
  ticketSettings?: TicketSettings;
}

export default function TicketsView() {
  const { colors: C } = useUi();
  const salesCtx = useSales();
  const sales = salesCtx.sales as unknown as TicketSale[];
  const ticketSettings = salesCtx.ticketSettings ?? {};
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('Todas');
  const [daysBack, setDaysBack] = useState(0);
  const [deliverSale, setDeliverSale] = useState<TicketSale | null>(null);
  const [deliverEmail, setDeliverEmail] = useState('');
  const [deliverPhone, setDeliverPhone] = useState('');
  const [delivering, setDelivering] = useState(false);
  const [deliverMsg, setDeliverMsg] = useState('');
  const [rangeSales, setRangeSales] = useState<TicketSale[] | null>(null);
  const [loadingRange, setLoadingRange] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const salesRef = useRef<TicketSale[]>(Array.isArray(sales) ? sales : []);

  useEffect(() => {
    salesRef.current = Array.isArray(sales) ? sales : [];
  }, [sales]);

  const displaySales = useMemo(
    () => rangeSales ?? (Array.isArray(sales) ? sales : []),
    [rangeSales, sales],
  );

  const today = new Date().toDateString();

  const cutoffTime = useMemo(() => {
    if (daysBack === 0) return 0;
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [daysBack]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRange(true);
    setRangeError('');
    const start = (() => {
      if (daysBack === 0) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }
      const d = new Date();
      d.setDate(d.getDate() - daysBack);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();

    (async () => {
      try {
        const acc: TicketSale[] = [];
        let page = 1;
        let hasNext = true;
        while (hasNext && page <= 100) {
          const q = new URLSearchParams({ page: String(page), pageSize: '100', from: String(start) });
          const data = await apiFetch(`/api/sales?${q}`);
          const list = unpackList<TicketSale>(data);
          acc.push(...list);
          const pagination = (data as { pagination?: { hasNext?: boolean } } | null)?.pagination;
          hasNext = pagination?.hasNext !== false && list.length === 100;
          page += 1;
        }
        const byId = new Map<string, TicketSale>();
        acc.forEach(s => byId.set(s.id, s));
        (Array.isArray(salesRef.current) ? salesRef.current : []).forEach(s => {
          const t = Number(s.closedAt) || 0;
          if (t >= start && !byId.has(s.id)) byId.set(s.id, s);
        });
        if (!cancelled) setRangeSales([...byId.values()]);
      } catch {
        if (!cancelled) {
          setRangeSales(null);
          setRangeError('No se pudo cargar el historial completo desde el servidor');
        }
      } finally {
        if (!cancelled) setLoadingRange(false);
      }
    })();

    return () => { cancelled = true; };
  }, [daysBack]);

  const filteredSales = useMemo(() => {
    if (!Array.isArray(displaySales)) return [];
    const sortKey = (s: TicketSale) => Number(s.closedAt) || 0;
    return displaySales
      .filter(s => {
        const t = Number(s.closedAt) || new Date(s.closedAt).getTime();
        if (daysBack > 0) {
          if (t < cutoffTime) return false;
        } else {
          const saleDate = new Date(t).toDateString();
          if (saleDate !== today) return false;
        }
        if (filterMethod !== 'Todas') {
          const method = s.paymentMethod || '';
          if (method.toLowerCase() !== filterMethod.toLowerCase()) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          const matchesTable = (s.tableName || '').toLowerCase().includes(q);
          const matchesEmployee = (s.employeeName || '').toLowerCase().includes(q);
          const matchesId = (s.id || '').toLowerCase().includes(q);
          if (!matchesTable && !matchesEmployee && !matchesId) return false;
        }
        return true;
      })
      .sort((a, b) => sortKey(b) - sortKey(a));
  }, [displaySales, today, filterMethod, search, daysBack, cutoffTime]);

  const totalAmount = filteredSales.reduce((s, x) => s + x.total, 0);
  const methods = useMemo(() => {
    if (!Array.isArray(displaySales)) return ['Todas'];
    const set = new Set<string>();
    displaySales.forEach(s => {
      if (s.paymentMethod) set.add(s.paymentMethod);
    });
    return ['Todas', ...Array.from(set)];
  }, [displaySales]);

  function printTicket(sale: TicketSale) {
    const items = (sale.items || []).filter(i => !i.voided);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmount = sale.discountAmount || 0;
    const totalConIgic = subtotal - discountAmount;
    const baseImponible = Math.round(totalConIgic * 100 / 1.07) / 100;
    const cuotaIgic = totalConIgic - baseImponible;
    const s = ticketSettings || {};
    const html = buildTicketHtml({
      items, subtotal, discountAmount, totalConIgic, baseImponible, cuotaIgic,
      tip: sale.tip || 0,
      tipMethod: sale.tipMethod || '',
      totalWithTip: sale.totalWithTip || sale.total || 0,
      restaurantName: s.restaurantName, companyCif: s.companyCif,
      companyAddress: s.companyAddress, companyPhone: s.companyPhone,
      logoUrl: s.logoUrl, footerText: s.footerText,       ticketWidth: s.ticketWidth != null ? String(s.ticketWidth) : undefined,
      tableName: sale.tableName || '',
      employeeName: sale.employeeName || '',
      ticketNumber: sale.ticketNumber ? `#${sale.ticketNumber}` : '',
      date: new Date(sale.closedAt).toLocaleString('es-ES'),
    });
    printTicketHtml(html);
  }

  function openDeliver(sale: TicketSale) {
    setDeliverSale(sale);
    setDeliverEmail(sale.invoiceEmail || '');
    setDeliverPhone(sale.invoicePhone || '');
    setDeliverMsg('');
  }

  async function deliverTicket() {
    if (!deliverSale || delivering) return;
    if (!deliverEmail.trim() && !deliverPhone.trim()) { setDeliverMsg('Indica un email o teléfono (con prefijo +34)'); return; }
    setDelivering(true);
    setDeliverMsg('');
    try {
      const res = await fetch('/api/tickets/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId: deliverSale.id, to: { email: deliverEmail.trim(), phone: deliverPhone.trim() } }),
      });
      const data = await res.json() as { results?: { email?: string; whatsapp?: string } };
      const results = data.results || {};
      const parts: string[] = [];
      if (deliverEmail.trim()) parts.push(results.email === 'sent' ? 'email enviado' : results.email === 'no_smtp' ? 'email pendiente (SMTP no configurado)' : `email: ${results.email || 'error'}`);
      if (deliverPhone.trim()) parts.push(results.whatsapp === 'sent' ? 'WhatsApp enviado' : results.whatsapp === 'no_twilio' ? 'WhatsApp pendiente (Twilio no configurado)' : `WhatsApp: ${results.whatsapp || 'error'}`);
      setDeliverMsg(parts.join(' · '));
      if (results.email === 'sent' || results.whatsapp === 'sent') setDeliverSale(null);
    } catch {
      setDeliverMsg('Error al enviar el ticket');
    } finally {
      setDelivering(false);
    }
  }

  function downloadCSV() {
    const rows: string[][] = [
      ['ID', 'Hora', 'Mesa', 'Empleado', 'Total', 'Método', 'Artículos'],
      ...filteredSales.map(s => {
        const d = new Date(s.closedAt);
        const items = (s.items || []).map(i => `${i.qty}x ${i.name}`).join('; ');
        return [
          s.id, d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          s.tableName || '', s.employeeName || '', s.total.toFixed(2),
          s.paymentMethod || '', items,
        ];
      }),
      [],
      ['TOTAL', '', '', '', totalAmount.toFixed(2), '', ''],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5" style={{ color: C.brassLight }} />
          <h2 className="font-display text-xl" style={{ color: C.cream }}>
            TICKETS {daysBack === 0 ? 'DE HOY' : daysBack === 7 ? 'DE LA SEMANA' : daysBack === 30 ? 'DEL MES' : ''}
          </h2>
          <span style={{ color: C.muted }} className="text-sm">
            ({filteredSales.length} tickets — {euros(totalAmount)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select value={daysBack} onChange={e => setDaysBack(Number(e.target.value))}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="rounded-lg px-3 py-1.5 text-xs">
            <option value={0}>Hoy</option>
            <option value={7}>Última semana</option>
            <option value={30}>Último mes</option>
            <option value={365}>Todo</option>
          </select>
          <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5" style={{ color: C.muted }} />
            <input
              type="text" placeholder="Buscar mesa, empleado..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', color: C.cream, outline: 'none', border: 'none' }}
              className="text-xs w-36"
            />
          </div>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="rounded-lg px-3 py-1.5 text-xs">
            {methods.map(m => (
              <option key={m} value={m}>{m === 'Todas' ? 'Todos los métodos' : m}</option>
            ))}
          </select>
          <button onClick={downloadCSV} disabled={filteredSales.length === 0}
            style={{ background: C.surfaceLight, color: C.cream }}
            className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40 hover:opacity-80">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {rangeError && (
        <div className="mb-4 rounded-lg px-4 py-2 text-xs" style={{ background: C.wine + '22', border: `1px solid ${C.wine}`, color: C.wineLight }}>
          {rangeError}
        </div>
      )}

      {filteredSales.length === 0 && !loadingRange ? (
        <div className="text-center py-16">
          <Ticket className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
          <p style={{ color: C.muted }} className="text-sm">
            No hay tickets en este período. Al pagar una mesa aparecerá aquí.
          </p>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl overflow-hidden">
          <div style={{ background: C.surfaceLight, color: C.muted }}
            className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wide">
            <span>Ticket</span>
            <span>Fecha</span>
            <span>Hora</span>
            <span>Mesa</span>
            <span>Empleado</span>
            <span className="text-right">Total</span>
            <span>Método</span>
            <span className="col-span-4">Artículos</span>
            <span className="text-right"></span>
          </div>
          {loadingRange && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs" style={{ color: C.muted }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando historial…
            </div>
          )}
          {filteredSales.map((s) => {
            const d = new Date(s.closedAt);
            const items = (s.items || []).slice(0, 3);
            const extra = (s.items || []).length - 3;
            return (
              <div key={s.id} style={{ borderTop: `1px solid ${C.line}` }}
                className="grid grid-cols-12 gap-2 px-4 py-2 text-sm items-center">
                <span className="font-mono text-xs" style={{ color: C.brass }}>
                  #{s.ticketNumber || '-'}
                </span>
                <span className="font-mono text-xs" style={{ color: C.muted }}>
                  {d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                </span>
                <span className="font-mono" style={{ color: C.cream }}>
                  {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ color: C.cream }}>{s.tableName || '—'}</span>
                <span style={{ color: C.muted }}>{s.employeeName || '—'}</span>
                <span className="font-mono text-right" style={{ color: C.brassLight }}>
                  {euros(s.total)}
                </span>
                <span className="text-xs" style={{ color: C.muted }}>
                  {s.paymentMethod || '—'}
                </span>
                <span className="col-span-4" style={{ color: C.muted }}>
                  {items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                  {extra > 0 && <span style={{ color: C.brass }}> +{extra} más</span>}
                </span>
                <button onClick={() => printTicket(s)}
                  style={{ color: C.muted, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  className="hover:opacity-80 mr-2" title="Imprimir">
                  <Printer className="w-3.5 h-3.5 inline" />
                </button>
                <button onClick={() => openDeliver(s)}
                  style={{ color: C.brassLight, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  className="hover:opacity-80 text-right" title="Enviar por email/WhatsApp">
                  <Send className="w-3.5 h-3.5 inline" />
                </button>
              </div>
            );
          })}
          <div style={{ borderTop: `2px solid ${C.brass}`, background: C.surfaceLight }}
            className="grid grid-cols-12 gap-2 px-4 py-3 text-sm font-semibold items-center">
            <span className="col-span-5" style={{ color: C.cream }}>{daysBack === 0 ? 'TOTAL DEL DÍA' : daysBack === 7 ? 'TOTAL DE LA SEMANA' : daysBack === 30 ? 'TOTAL DEL MES' : 'TOTAL'}</span>
            <span className="font-mono text-right" style={{ color: C.brassLight }}>
              {euros(totalAmount)}
            </span>
            <span className="col-span-6" style={{ color: C.muted }}>
              {filteredSales.length} tickets
            </span>
          </div>
        </div>
      )}

      {deliverSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => !delivering && setDeliverSale(null)}>
          <div style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg" style={{ color: C.cream }}>
                Enviar ticket #{deliverSale.ticketNumber || '-'}
              </h3>
              {!delivering && <button onClick={() => setDeliverSale(null)} style={{ color: C.muted }} className="hover:opacity-70">
                <X className="w-4 h-4" />
              </button>}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
                <Mail className="w-4 h-4" style={{ color: C.muted }} />
                <input type="email" value={deliverEmail} placeholder="Email del cliente"
                  onChange={e => setDeliverEmail(e.target.value)}
                  style={{ background: 'transparent', color: C.cream, outline: 'none' }} className="text-sm w-full" />
              </div>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
                <MessageCircle className="w-4 h-4" style={{ color: C.muted }} />
                <input type="tel" value={deliverPhone} placeholder="WhatsApp (con prefijo, ej. +34...)"
                  onChange={e => setDeliverPhone(e.target.value)}
                  style={{ background: 'transparent', color: C.cream, outline: 'none' }} className="text-sm w-full" />
              </div>
              <button onClick={deliverTicket} disabled={delivering}
                style={{ background: C.brass, color: C.base }}
                className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                <Send className="w-4 h-4" />
                {delivering ? 'Enviando…' : 'Enviar ticket digital'}
              </button>
              {deliverMsg && <p className="text-xs text-center" style={{ color: deliverMsg.includes('enviado') ? C.sageLight : C.wineLight }}>{deliverMsg}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

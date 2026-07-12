"use client";

import { useState, type ComponentType } from 'react';
import { Banknote, CreditCard, Smartphone, Clock, X, CheckCircle2, Printer, Check, Trash2, type LucideProps } from 'lucide-react';
import { euros, round2, PAYMENT_METHODS, type Theme } from './constants';
import StripeModal from './StripeModal';

interface PaymentSplit {
  id: string;
  method: string;
  amount: number;
  itemIds?: string[];
}

interface SplitOrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface PaymentTable {
  id: string;
  name: string;
}

interface CurrentUser {
  id?: string;
  name?: string;
}

interface StripePaymentIntent {
  id: string;
  status: string;
}

interface PaymentModalProps {
  selectedTable: PaymentTable | null;
  currentUser: CurrentUser | null;
  finalTotal: number;
  orderDiscount: number;
  tipAmount: number;
  setTipAmount: (v: number) => void;
  tipMethod: string;
  setTipMethod: (v: string) => void;
  paymentSplits: PaymentSplit[];
  remaining: number;
  canConfirm: boolean;
  onAddSplit: (method: string) => void;
  onUpdateSplitAmount: (id: string, value: string) => void;
  onRemoveSplit: (id: string) => void;
  onToggleSplitItem?: (splitId: string, itemId: string) => void;
  onConfirm: () => void;
  onStripeSuccess?: (paymentIntent: StripePaymentIntent) => void;
  onCancel: () => void;
  onPrint: () => void;
  showToast: (msg: string) => void;
  orderItems: SplitOrderItem[];
  invoiceNif: string;
  setInvoiceNif: (v: string) => void;
  invoiceName: string;
  setInvoiceName: (v: string) => void;
  invoiceAddress: string;
  setInvoiceAddress: (v: string) => void;
  invoiceEmail: string;
  setInvoiceEmail: (v: string) => void;
  colors: Theme;
}

const PAYMENT_METHODS_UI = PAYMENT_METHODS.map(m => ({
  ...m,
  icon: { efectivo: Banknote, tarjeta: CreditCard, bizum: Smartphone, fiado: Clock }[m.id as 'efectivo' | 'tarjeta' | 'bizum' | 'fiado'] as ComponentType<LucideProps>,
  color: { efectivo: '#7a9a7c', tarjeta: '#c4a04a', bizum: '#6b9bf8', fiado: '#b05e5e' }[m.id as 'efectivo' | 'tarjeta' | 'bizum' | 'fiado'],
}));

export default function PaymentModal({
  selectedTable,
  currentUser,
  finalTotal, orderDiscount, tipAmount, setTipAmount, tipMethod, setTipMethod,
  paymentSplits, remaining, canConfirm,
  onAddSplit, onUpdateSplitAmount, onRemoveSplit, onToggleSplitItem,
  onConfirm, onStripeSuccess, onCancel,
  onPrint,
  showToast,
  orderItems,
  invoiceNif, setInvoiceNif, invoiceName, setInvoiceName,
  invoiceAddress, setInvoiceAddress, invoiceEmail, setInvoiceEmail,
  colors: C,
}: PaymentModalProps) {
  const [showInvoice, setShowInvoice] = useState(false);
  const [stripeOpen, setStripeOpen] = useState(false);
  const hasCardSplit = paymentSplits.some(s => s.method === 'tarjeta');
  const hasBizumSplit = paymentSplits.some(s => s.method === 'bizum');
  const hasStripeSplit = hasCardSplit || hasBizumSplit;
  const stripeAmount = paymentSplits.filter(s => s.method === 'tarjeta' || s.method === 'bizum').reduce((s, sp) => s + round2(sp.amount), 0);

  const assignedItemIds = new Set(
    paymentSplits.filter(s => s.method !== 'fiado').flatMap(s => s.itemIds || [])
  );

  function handleStripeSuccess(paymentIntent: StripePaymentIntent) {
    setStripeOpen(false);
    showToast(`Pago confirmado · ${paymentIntent.id.slice(-6).toUpperCase()}`);
    if (onStripeSuccess) {
      onStripeSuccess(paymentIntent);
    } else {
      onConfirm();
    }
  }

  function toggleItem(splitId: string, itemId: string) {
    if (onToggleSplitItem) onToggleSplitItem(splitId, itemId);
  }

  const tipPresets = [0, 5, 10, 15, 20];

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4 no-print"
        style={{ background: 'rgba(0,0,0,0.65)' }}
      >
        <div
          style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="w-full max-w-sm rounded-xl p-5 fade-up max-h-[90vh] overflow-y-auto"
        >
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">
            {selectedTable?.name}
          </p>
          <div className="mb-4">
            <p className="font-display text-3xl" style={{ color: C.brassLight }}>{euros(finalTotal)}</p>
            {orderDiscount > 0 && <p style={{ color: C.sage }} className="font-mono text-xs mt-1">Descuento {orderDiscount}%</p>}
            {tipAmount > 0 && (
              <p style={{ color: C.brass }} className="font-mono text-xs mt-1 flex items-center gap-1">
                +{euros(tipAmount)} propina
                <span style={{ color: C.muted, fontSize: 9 }} className="px-1 rounded" title="No afecta a la base imponible">· NO fiscal</span>
              </p>
            )}
          </div>

          {/* Propinas */}
          <div className="mb-5">
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2.5 flex items-center gap-1">
              Propina <span style={{ color: C.muted, fontSize: 9, fontWeight: 400, textTransform: 'none' }}>· NO fiscal</span>
            </p>
            <div className="flex gap-2 mb-2.5">
              {tipPresets.map(pct => {
                const val = round2(finalTotal * (pct / 100));
                const active = Math.abs(tipAmount - val) < 0.01;
                return (
                  <button key={pct} onClick={() => setTipAmount(val)}
                    style={{ background: active ? C.brass : C.surfaceLight, color: active ? C.base : C.muted }}
                    className="flex-1 rounded-lg py-2 text-xs font-medium transition-all hover:opacity-90">
                    {pct}%
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <input type="number" step="0.01" value={tipAmount}
                onChange={e => setTipAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{ background: C.surfaceLight, color: C.cream }}
                className="w-full rounded-lg px-3 py-2.5 text-sm font-mono text-center"
                placeholder="Propina personalizada (0 para quitar)" />
              {tipAmount > 0 && (
                <button onClick={() => setTipAmount(0)}
                  style={{ color: C.wineLight }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs flex items-center gap-1 hover:opacity-80">
                  <Trash2 className="w-3 h-3" /> Quitar
                </button>
              )}
            </div>

            {/* Método de propina */}
            {tipAmount > 0 && (
              <div className="flex gap-2 mt-2.5">
                {['efectivo', 'tarjeta'].map(m => (
                  <button key={m} onClick={() => setTipMethod(m)}
                    style={{
                      background: tipMethod === m ? C.surfaceLight + '80' : 'transparent',
                      border: `1px solid ${tipMethod === m ? C.brass : C.line}`,
                      color: tipMethod === m ? C.brassLight : C.muted,
                    }}
                    className="flex-1 rounded-lg py-1.5 text-[11px] font-medium flex items-center justify-center gap-1">
                    {m === 'efectivo' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                    Propina en {m === 'efectivo' ? 'efectivo' : 'tarjeta'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Factura */}
          <div className="mb-5">
            <button onClick={() => setShowInvoice(!showInvoice)}
              style={{ color: showInvoice ? C.brassLight : C.muted }}
              className="text-xs uppercase tracking-wide flex items-center gap-1.5 mb-2 hover:opacity-80">
              {showInvoice ? '▾' : '▸'} Factura {showInvoice && '· rellena los datos del cliente'}
            </button>
            {showInvoice && (
              <div className="space-y-2">
                <input type="text" value={invoiceNif} onChange={e => setInvoiceNif(e.target.value)}
                  placeholder="NIF / CIF / NIE *" style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm" />
                <input type="text" value={invoiceName} onChange={e => setInvoiceName(e.target.value)}
                  placeholder="Nombre o razón social *" style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm" />
                <input type="text" value={invoiceAddress} onChange={e => setInvoiceAddress(e.target.value)}
                  placeholder="Dirección (opcional)" style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm" />
                <input type="email" value={invoiceEmail} onChange={e => setInvoiceEmail(e.target.value)}
                  placeholder="Email (opcional)" style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
          </div>

          <p
            style={{ color: Math.abs(remaining) < 0.005 ? C.sageLight : C.wineLight }}
            className="font-mono text-xs mb-4"
          >
            {Math.abs(remaining) < 0.005 ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Importe cubierto
              </span>
            ) : `Queda: ${euros(remaining)}`}
          </p>

          {/* Splits existentes */}
          {paymentSplits.length > 0 && (
            <div className="flex flex-col gap-3 mb-4">
              {paymentSplits.map(sp => {
                const meta = PAYMENT_METHODS_UI.find(m => m.id === sp.method);
                const Icon = meta!.icon;
                const isFiado = sp.method === 'fiado';
                const splitItemIds = new Set(sp.itemIds || []);
                const itemAmount = (orderItems || [])
                  .filter(i => splitItemIds.has(i.id))
                  .reduce((s, i) => s + i.price * i.qty, 0);
                const displayAmount = isFiado ? sp.amount : (splitItemIds.size > 0 ? itemAmount : sp.amount);

                return (
                  <div key={sp.id} style={{ background: C.surfaceLight }} className="rounded-lg px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Icon className="w-4.5 h-4.5 shrink-0" style={{ color: meta!.color }} />
                      <span className="text-sm flex-1 font-medium">{meta!.label}</span>
                      {isFiado ? (
                        <span className="font-mono" style={{ color: C.brassLight }}>{euros(sp.amount)}</span>
                      ) : (
                        <input type="number" step="0.01" value={sp.amount}
                          onChange={e => onUpdateSplitAmount(sp.id, e.target.value)}
                          style={{ background: C.surface, color: C.cream, width: 80 }}
                          className="font-mono rounded-md px-2.5 py-1.5 text-sm text-right" />
                      )}
                      <button onClick={() => onRemoveSplit(sp.id)} style={{ color: C.muted }} className="hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {!isFiado && orderItems && orderItems.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {orderItems.map(item => {
                          const alreadyAssigned = assignedItemIds.has(item.id) && !splitItemIds.has(item.id);
                          const selected = splitItemIds.has(item.id);
                          return (
                            <button key={item.id}
                              onClick={() => toggleItem(sp.id, item.id)}
                              disabled={alreadyAssigned}
                              style={{
                                background: selected ? meta!.color : (alreadyAssigned ? 'transparent' : C.surface),
                                color: selected ? '#fff' : C.muted,
                                border: `1px solid ${selected ? meta!.color : C.line}`,
                                opacity: alreadyAssigned ? 0.3 : 1,
                              }}
                              className="rounded-md px-2 py-1 text-[11px] font-medium disabled:cursor-not-allowed transition-all">
                              {selected && <Check className="w-3 h-3 inline mr-1" />}
                              {item.name} ×{item.qty}
                            </button>
                          );
                        })}
                        {splitItemIds.size > 0 && (
                          <span className="text-[10px] self-center ml-1" style={{ color: C.muted }}>
                            = {euros(displayAmount)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Botones de método */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {PAYMENT_METHODS_UI.map(m => {
              const Icon = m.icon;
              const isFiadoAlready = paymentSplits.some(p => p.method === 'fiado');
              const hasThisMethod = paymentSplits.some(p => p.method === m.id);
              const disabled = m.id !== 'fiado' && remaining <= 0.005;
              return (
                <button key={m.id}
                  onClick={() => {
                    if (m.id === 'fiado') { onAddSplit('fiado'); }
                    else if (isFiadoAlready) { showToast('No se puede mezclar Fiado con otros métodos'); }
                    else { onAddSplit(m.id); }
                  }}
                  disabled={disabled || (m.id === 'fiado' && isFiadoAlready)}
                  style={{
                    background: hasThisMethod ? m.color : C.surfaceLight,
                    color: hasThisMethod ? '#fff' : C.muted,
                    opacity: disabled || (m.id === 'fiado' && isFiadoAlready) ? 0.4 : 1,
                  }}
                  className="rounded-lg py-3 flex flex-col items-center gap-1.5 text-xs font-medium disabled:cursor-not-allowed transition-all hover:opacity-90">
                  <Icon className="w-4.5 h-4.5" /> {m.label}
                </button>
              );
            })}
          </div>

          {/* Imprimir ticket */}
          <button onClick={onPrint}
            style={{ background: C.surfaceLight, color: C.muted, border: `1px solid ${C.line}` }}
            className="w-full rounded-lg py-2.5 text-xs font-medium flex items-center justify-center gap-2 mb-2 hover:opacity-80 transition-all">
            <Printer className="w-4 h-4" /> Imprimir ticket
          </button>

          {/* Botón confirmar */}
          <button onClick={() => { if (hasStripeSplit) { setStripeOpen(true); } else { onConfirm(); } }}
            disabled={!canConfirm}
            style={{ background: canConfirm ? C.sage : C.surfaceLight, color: canConfirm ? '#fff' : C.muted }}
            className="w-full rounded-lg py-3.5 text-sm font-semibold disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-all">
            {hasStripeSplit
              ? <><CreditCard className="w-4.5 h-4.5" /> Pagar {euros(stripeAmount)} con Stripe</>
              : <><CheckCircle2 className="w-4.5 h-4.5" /> Confirmar cobro</>}
          </button>

          <button onClick={onCancel}
            style={{ color: C.muted }}
            className="w-full rounded-lg py-2.5 text-sm mt-2 hover:opacity-80 transition-all">
            Cancelar
          </button>
        </div>
      </div>

      {stripeOpen && (
        <StripeModal
          amount={stripeAmount}
          finalTotal={finalTotal}
          selectedTable={selectedTable}
          currentUser={currentUser}
          onSuccess={handleStripeSuccess}
          onCancel={() => setStripeOpen(false)}
          colors={C}
        />
      )}
    </>
  );
}

"use client";

import { useState } from 'react';
import { Banknote, CreditCard, Smartphone, Clock, X } from 'lucide-react';
import { euros, round2 } from './constants';
import StripeModal from './StripeModal';

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'tarjeta',  label: 'Tarjeta',  icon: CreditCard },
  { id: 'bizum',    label: 'Bizum',    icon: Smartphone },
  { id: 'fiado',    label: 'Fiado',    icon: Clock },
];

export default function PaymentModal({
  selectedTable,
  currentUser,
  finalTotal, orderDiscount, tipAmount, setTipAmount,
  paymentSplits, remaining, canConfirm,
  onAddSplit, onUpdateSplitAmount, onRemoveSplit,
  onConfirm, onCancel,
  showToast,
  colors: C,
}) {
  // Controla si mostramos el flujo de Stripe en lugar del modal normal
  const [stripeOpen, setStripeOpen] = useState(false);

  // El pago es 100% tarjeta cuando hay un único split de tarjeta
  const isCardOnly = paymentSplits.length === 1 && paymentSplits[0].method === 'tarjeta';

  // Cuando Stripe confirma el pago exitosamente, cerramos su modal
  // y llamamos onConfirm para registrar la venta en nuestra BD
  function handleStripeSuccess(paymentIntent) {
    setStripeOpen(false);
    showToast(`Pago con tarjeta confirmado · ${paymentIntent.id.slice(-6).toUpperCase()}`);
    onConfirm();
  }

  return (
    <>
      {/* Modal principal de cobro */}
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
          <div className="mb-3">
            <p className="font-display text-2xl" style={{ color: C.brassLight }}>{euros(finalTotal)}</p>
            {orderDiscount > 0 && <p style={{ color: C.sage }} className="font-mono text-xs">Descuento {orderDiscount}%</p>}
            {tipAmount > 0 && <p style={{ color: C.brass }} className="font-mono text-xs">+{euros(tipAmount)} propina</p>}
          </div>

          {/* Propinas */}
          <div className="mb-4">
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">Propina</p>
            <div className="flex gap-2 mb-2">
              {[0, 0.5, 1, 1.5, 2].map(t => {
                const val = round2(finalTotal * (t / 100));
                const active = Math.abs(tipAmount - val) < 0.01;
                return (
                  <button
                    key={t}
                    onClick={() => setTipAmount(val)}
                    style={{ background: active ? C.brass : C.surfaceLight, color: active ? C.base : C.muted }}
                    className="flex-1 rounded-lg py-1.5 text-xs font-medium"
                  >
                    {t}%
                  </button>
                );
              })}
            </div>
            <input
              type="number" step="0.01" value={tipAmount}
              onChange={e => setTipAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-2 text-sm font-mono text-center"
              placeholder="Propina personalizada"
            />
          </div>

          <p
            style={{ color: Math.abs(remaining) < 0.005 ? C.sageLight : C.wineLight }}
            className="font-mono text-xs mb-4"
          >
            {Math.abs(remaining) < 0.005 ? 'Importe cubierto' : `Restante: ${euros(remaining)}`}
          </p>

          {/* Splits existentes */}
          {paymentSplits.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {paymentSplits.map(sp => {
                const meta = PAYMENT_METHODS.find(m => m.id === sp.method);
                const Icon = meta.icon;
                return (
                  <div key={sp.id} style={{ background: C.surfaceLight }} className="flex items-center gap-2 rounded-lg px-3 py-2">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: C.muted }} />
                    <span className="text-sm flex-1">{meta.label}</span>
                    {sp.method === 'fiado' ? (
                      <span className="font-mono" style={{ color: C.brassLight }}>{euros(sp.amount)}</span>
                    ) : (
                      <input
                        type="number" step="0.01" value={sp.amount}
                        onChange={e => onUpdateSplitAmount(sp.id, e.target.value)}
                        style={{ background: C.surface, color: C.cream, width: 76 }}
                        className="font-mono rounded-md px-2 py-1 text-sm text-right"
                      />
                    )}
                    <button onClick={() => onRemoveSplit(sp.id)} style={{ color: C.muted }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botones de método */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PAYMENT_METHODS.map(m => {
              const Icon = m.icon;
              const isFiadoAlready = paymentSplits.some(p => p.method === 'fiado');
              const disabled = m.id !== 'fiado' && remaining <= 0.005;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    if (m.id === 'fiado') {
                      onAddSplit('fiado');
                    } else if (isFiadoAlready) {
                      showToast('No se puede mezclar Fiado con otros metodos');
                    } else {
                      onAddSplit(m.id);
                    }
                  }}
                  disabled={disabled || (m.id === 'fiado' && isFiadoAlready)}
                  style={{
                    background: C.surfaceLight,
                    opacity: disabled || (m.id === 'fiado' && isFiadoAlready) ? 0.4 : 1,
                    border: paymentSplits.some(p => p.method === m.id)
                      ? `1px solid ${C.brass}`
                      : `1px solid transparent`,
                  }}
                  className="rounded-lg py-3 flex flex-col items-center gap-1.5 text-xs font-medium disabled:cursor-not-allowed"
                >
                  <Icon className="w-4 h-4" /> {m.label}
                </button>
              );
            })}
          </div>

          {/* Botón confirmar — si es solo tarjeta abre Stripe, si no confirma directo */}
          <button
            onClick={() => {
              if (isCardOnly) {
                setStripeOpen(true);
              } else {
                onConfirm();
              }
            }}
            disabled={!canConfirm}
            style={{ background: canConfirm ? C.brass : C.surfaceLight, color: canConfirm ? C.base : C.muted }}
            className="w-full rounded-lg py-3 text-sm font-semibold disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCardOnly
              ? <><CreditCard className="w-4 h-4" /> Pagar con Stripe</>
              : 'Confirmar'
            }
          </button>

          <button
            onClick={onCancel}
            style={{ color: C.muted }}
            className="w-full rounded-lg py-2 text-sm mt-1"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Modal de Stripe Elements — se monta encima cuando isCardOnly y stripeOpen */}
      {stripeOpen && (
        <StripeModal
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

"use client";

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { X, AlertTriangle } from 'lucide-react';
import StripePaymentForm from './StripePaymentForm';

// Instancia singleton de Stripe (se carga una sola vez)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function StripeModal({
  finalTotal,
  selectedTable,
  currentUser,
  onSuccess,   // (paymentIntent) => void
  onCancel,
  colors: C,
}) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loadError,    setLoadError]    = useState(null);

  // Crear el PaymentIntent al montar el modal
  useEffect(() => {
    async function createIntent() {
      try {
        const res = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount:       finalTotal,
            tableId:      selectedTable?.id,
            tableName:    selectedTable?.name,
            employeeName: currentUser?.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Error al crear el pago');
        setClientSecret(data.clientSecret);
      } catch (err) {
        setLoadError(err.message);
      }
    }
    createIntent();
  }, []);   // solo al montar

  // Apariencia de Stripe Elements adaptada a los colores del TPV
  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary:        C.brassLight,
      colorBackground:     C.surfaceLight,
      colorText:           C.cream,
      colorDanger:         C.wineLight,
      fontFamily:          "'Inter', sans-serif",
      borderRadius:        '8px',
      spacingUnit:         '4px',
    },
    rules: {
      '.Input': {
        backgroundColor: C.surface,
        border: `1px solid ${C.line}`,
        color: C.cream,
      },
      '.Input:focus': {
        border: `1px solid ${C.brass}`,
        boxShadow: `0 0 0 2px rgba(200,147,43,0.2)`,
      },
      '.Label': { color: C.muted },
      '.Tab': { border: `1px solid ${C.line}`, backgroundColor: C.surface },
      '.Tab--selected': { border: `1px solid ${C.brass}`, backgroundColor: C.surfaceLight },
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.line}` }}
        className="w-full max-w-md rounded-2xl p-5 fade-up max-h-[90vh] overflow-y-auto"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-display text-xl" style={{ color: C.cream }}>PAGO CON TARJETA</p>
            {selectedTable && (
              <p style={{ color: C.muted }} className="text-xs mt-0.5">{selectedTable.name}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            style={{ color: C.muted }}
            className="p-1.5 rounded-lg hover:opacity-80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        {loadError ? (
          <div
            style={{ background: 'rgba(162,62,62,0.15)', border: `1px solid rgba(162,62,62,0.4)` }}
            className="rounded-xl p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.wineLight }} />
            <div>
              <p className="text-sm font-medium" style={{ color: C.cream }}>No se pudo iniciar el pago</p>
              <p className="text-xs mt-1" style={{ color: C.muted }}>{loadError}</p>
              <button
                onClick={onCancel}
                style={{ color: C.muted }}
                className="text-xs mt-3 hover:opacity-80"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : !clientSecret ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div
              style={{ borderColor: C.brass, borderTopColor: 'transparent' }}
              className="w-8 h-8 rounded-full border-4 animate-spin"
            />
            <p style={{ color: C.muted }} className="text-sm">Conectando con Stripe...</p>
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance }}
          >
            <StripePaymentForm
              finalTotal={finalTotal}
              onSuccess={onSuccess}
              onCancel={onCancel}
              colors={C}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

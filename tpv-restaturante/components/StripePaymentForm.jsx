"use client";

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, Loader } from 'lucide-react';
import { euros } from './constants';

export default function StripePaymentForm({ amount, finalTotal, onSuccess, onCancel, colors: C }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [error,      setError]      = useState(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    // Confirmar el pago sin redirigir (return_url solo si hay 3DS)
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent);
    } else {
      setError(`Estado inesperado: ${paymentIntent?.status}`);
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Importe */}
      <div
        style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
        className="rounded-xl px-4 py-3 flex items-center justify-between"
      >
        <span style={{ color: C.muted }} className="text-sm">{amount ? 'Pago con tarjeta' : 'Total a cobrar'}</span>
        <span className="font-display text-2xl" style={{ color: C.brassLight }}>
          {euros(amount || finalTotal)}
        </span>
      </div>

      {/* Stripe Elements */}
      <div
        style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
        className="rounded-xl p-4"
      >
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card'],
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <p
          style={{ background: 'rgba(162,62,62,0.15)', border: `1px solid rgba(162,62,62,0.4)`, color: C.wineLight }}
          className="text-sm rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      {/* Botones */}
      <button
        type="submit"
        disabled={!stripe || processing}
        style={{
          background: (!stripe || processing) ? C.surfaceLight : C.brass,
          color:      (!stripe || processing) ? C.muted : C.base,
        }}
        className="w-full rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed transition-colors"
      >
        {processing
          ? <><Loader className="w-4 h-4 animate-spin" /> Procesando...</>
          : <><CreditCard className="w-4 h-4" /> Confirmar pago {euros(amount || finalTotal)}</>
        }
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={processing}
        style={{ color: C.muted }}
        className="w-full rounded-lg py-2 text-sm hover:opacity-80 disabled:opacity-40"
      >
        Cancelar
      </button>
    </form>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Minus, ShoppingCart, X, ChevronLeft, Check, Loader2, MapPin, Clock, Truck, Store } from 'lucide-react';

const DAYS: string[] = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

interface Category {
  id: string;
  name: string;
  active?: boolean;
  show_qr?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  description?: string;
  active?: boolean;
  show_qr?: boolean;
  agotado?: boolean;
  course?: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  notes: string;
  modifiers: unknown[];
  course: string;
}

interface Settings {
  onlineOrderingEnabled?: string;
  onlinePaymentRequired?: string;
  onlineAutoAccept?: string;
  onlinePrepTime?: string;
  onlineOrderingModes?: string;
  onlineSchedules?: string;
  qrThemePrimary?: string;
  qrThemeSecondary?: string;
  restaurantName?: string;
}

interface Schedule {
  day: number;
  open: string;
  close: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  cost: number;
  estimatedMinutes: number;
  active?: boolean;
}

export default function OnlineOrderingPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Record<string, unknown> | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [orderResult, setOrderResult] = useState<Record<string, unknown> | null>(null);
  const [step, setStep] = useState<string>('menu');

  const [modality, setModality] = useState<string>('delivery');
  const [address, setAddress] = useState<string>('');
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('now');
  const [scheduledHour, setScheduledHour] = useState<string>('');

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/delivery-zones').then(r => r.json()),
    ]).then(([cat, s, z]) => {
      const catData = cat as Record<string, unknown>;
      setCatalog(catData);
      setSettings(s as Settings);
      setZones((z || []) as DeliveryZone[]);
      const cats = catData.categories as unknown[];
      if (cats?.length > 0) setActiveCategory((cats[0] as Record<string, unknown>).id as string);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const onlineEnabled = settings?.onlineOrderingEnabled !== 'false';
  const paymentRequired = settings?.onlinePaymentRequired !== 'false';
  const autoAccept = settings?.onlineAutoAccept !== 'false';
  const prepTime = Number(settings?.onlinePrepTime || 20);
  const modes: string[] = useMemo(() => {
    try { return JSON.parse(settings?.onlineOrderingModes || '["delivery"]') as string[]; } catch { return ['delivery']; }
  }, [settings]);

  const schedules: Schedule[] = useMemo(() => {
    try { return JSON.parse(settings?.onlineSchedules || '[]') as Schedule[]; } catch { return []; }
  }, [settings]);

  const theme: { primary: string; secondary: string } = {
    primary: settings?.qrThemePrimary || '#c4a04a',
    secondary: settings?.qrThemeSecondary || '#1a1a1a',
  };

  const visibleProducts: Product[] = useMemo(() => {
    if (!catalog) return [];
    const catMap: Record<string, Category> = {};
    for (const c of (catalog.categories as Category[] || [])) catMap[c.name] = c;
    return (catalog.products as Product[] || []).filter(p => {
      if (p.active === false || p.show_qr === false || p.agotado === true) return false;
      const cat = catMap[p.category];
      if (!cat || cat.active === false || cat.show_qr === false) return false;
      return true;
    });
  }, [catalog]);

  const categories: Category[] = useMemo(() => {
    if (!catalog) return [];
    return (catalog.categories as Category[] || []).filter(c => {
      if (c.active === false || c.show_qr === false) return false;
      return visibleProducts.some(p => p.category === c.name);
    });
  }, [catalog, visibleProducts]);

  const isOpen: boolean = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const today = schedules.find(s => s.day === day);
    if (!today) return false;
    return hhmm >= today.open && hhmm <= today.close;
  }, [schedules]);

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), qty: 1, notes: '', modifiers: [], course: product.course || '' }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.productId !== productId);
      return prev.map(i => i.productId === productId ? { ...i, qty: newQty } : i);
    });
  }

  const cartTotal: number = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const cartCount: number = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  function findZone(addr: string): DeliveryZone | null {
    if (!addr || !zones?.length) return null;
    const lower = addr.toLowerCase();
    const matched = zones.find(z =>
      z.active !== false && lower.includes(z.name.toLowerCase())
    );
    return matched || zones.find(z => z.active !== false) || null;
  }

  async function handlePlaceOrder() {
    setSubmitting(true);
    setError('');
    const zone = selectedZone || findZone(address);
    const deliveryCost = modality === 'delivery' ? (zone?.cost || 0) : 0;

    try {
      const r = await fetch('/api/qr-order', {
        method: 'POST',
        body: JSON.stringify({
          items: cart, amount: cartTotal, customerName, customerPhone, customerEmail,
          notes, modality, address, addressLat, addressLng,
          zoneId: zone?.id || '', deliveryCost,
          scheduledAt: scheduledTime === 'later' && scheduledHour ? new Date(scheduledHour).getTime() : null,
          paymentRequired, autoAccept,
        }),
      });
      const data = await r.json() as { ok?: boolean; orderId?: string; error?: string };
      if (data.ok) {
        setOrderResult(data as unknown as Record<string, unknown>);
        setStep('result');
      } else {
        setError(data.error || 'Error al enviar');
      }
    } catch { setError('Error de conexión'); }
    setSubmitting(false);
  }

  const bg = theme.secondary;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.primary }} />
    </div>;
  }

  if (!onlineEnabled) {
    return <div className="min-h-screen flex items-center justify-center p-6" style={{ background: bg }}>
      <p className="text-lg font-bold" style={{ color: '#8a8275' }}>Pedidos online no disponibles</p>
    </div>;
  }

  if (step === 'result' && orderResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: bg }}>
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: theme.primary + '30' }}>
            <Check className="w-8 h-8" style={{ color: theme.primary }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#e8e0d4' }}>
            {modality === 'delivery' ? '¡Pedido recibido!' : '¡Pedido en marcha!'}
          </h1>
          <p className="text-sm" style={{ color: '#8a8275' }}>
            {modality === 'delivery' ? 'Preparamos tu pedido para enviarlo.' : 'Pasa a recogerlo cuando esté listo.'}
            {paymentRequired ? ' El pago se ha realizado correctamente.' : ''}
          </p>
          <div className="p-4 rounded-xl space-y-2 text-left" style={{ background: '#222' }}>
            <p className="text-xs font-medium" style={{ color: '#8a8275' }}>Resumen</p>
            {cart.map(item => (
              <div key={item.productId} className="flex justify-between text-xs">
                <span style={{ color: '#e8e0d4' }}>{item.qty}x {item.name}</span>
                <span style={{ color: theme.primary }}>{(item.price * item.qty).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>
            ))}
            {modality === 'delivery' && (
              <div className="flex justify-between text-xs" style={{ color: '#6b655a' }}>
                <span>Envío</span>
                <span>{0} €</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px solid #333' }}>
              <span style={{ color: '#e8e0d4' }}>Total</span>
              <span style={{ color: theme.primary }}>{(cartTotal + 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
            </div>
          </div>
          <button onClick={() => router.push(`/pedir/track/${orderResult.orderId as string}`)}
            className="w-full py-3 rounded-lg text-sm font-bold hover:opacity-80"
            style={{ background: theme.primary, color: '#000' }}>
            Seguir pedido
          </button>
          <button onClick={() => { setCart([]); setStep('menu'); setOrderResult(null); }}
            className="w-full py-2 text-xs" style={{ color: '#6b655a' }}>
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: bg, paddingBottom: '80px' }}>
      <div className="sticky top-0 z-30" style={{ background: bg + 'e6', borderBottom: '1px solid #333', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="font-bold text-lg" style={{ color: '#e8e0d4' }}>
              {settings?.restaurantName || 'La Comanda'}
            </span>
            {!isOpen && <p className="text-[10px]" style={{ color: '#b05e5e' }}>Cerrado ahora</p>}
          </div>
          <div className="flex items-center gap-2">
            {step !== 'menu' && (
              <button onClick={() => setStep('menu')} className="p-2" style={{ color: '#8a8275' }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setShowCart(true)} className="relative p-2 rounded-lg" style={{ background: theme.primary + '20' }}>
              <ShoppingCart className="w-5 h-5" style={{ color: theme.primary }} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: theme.primary, color: '#000' }}>
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {step === 'menu' && cartCount === 0 && (
          <div className="flex gap-2 px-4 pb-2">
            {modes.includes('delivery') && (
              <button onClick={() => setModality('delivery')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-1 justify-center"
                style={{ background: modality === 'delivery' ? theme.primary + '25' : '#222', color: modality === 'delivery' ? theme.primary : '#8a8275', border: modality === 'delivery' ? `1px solid ${theme.primary}` : '1px solid #333' }}>
                <Truck className="w-3.5 h-3.5" /> Domicilio
              </button>
            )}
            {modes.includes('pickup') && (
              <button onClick={() => setModality('pickup')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-1 justify-center"
                style={{ background: modality === 'pickup' ? theme.primary + '25' : '#222', color: modality === 'pickup' ? theme.primary : '#8a8275', border: modality === 'pickup' ? `1px solid ${theme.primary}` : '1px solid #333' }}>
                <Store className="w-3.5 h-3.5" /> Recogida
              </button>
            )}
          </div>
        )}

        <div className="flex overflow-x-auto gap-1 px-4 pb-2 scrollbar-none">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: activeCategory === cat.id ? theme.primary + '30' : '#333', color: activeCategory === cat.id ? theme.primary : '#8a8275' }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {categories.map(cat => {
          if (activeCategory && cat.id !== activeCategory) return null;
          const products = visibleProducts.filter(p => p.category === cat.name);
          if (products.length === 0) return null;
          return (
            <div key={cat.id}>
              <h2 className="text-sm font-bold mb-2" style={{ color: '#e8e0d4' }}>{cat.name}</h2>
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} onClick={() => addToCart(p)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
                    style={{ background: '#222' }}>
                    {p.image && <img src={p.image} alt={p.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#e8e0d4' }}>{p.name}</p>
                      {p.description && <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: '#6b655a' }}>{p.description}</p>}
                      <p className="text-sm font-bold mt-1" style={{ color: theme.primary }}>{Number(p.price).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {cart.find(i => i.productId === p.id) ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => updateQty(p.id, -1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: theme.primary + '20', color: theme.primary }}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold w-5 text-center" style={{ color: '#e8e0d4' }}>{cart.find(i => i.productId === p.id)!.qty}</span>
                          <button onClick={() => updateQty(p.id, 1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: theme.primary, color: '#000' }}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: theme.primary, color: '#000' }}>
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4" style={{ background: bg + 'f2', borderTop: '1px solid #333', backdropFilter: 'blur(8px)' }}>
          <button onClick={() => { setStep('checkout'); setShowCart(false); }}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-between px-4"
            style={{ background: theme.primary, color: '#000' }}>
            <span>{cartCount} producto{cartCount !== 1 ? 's' : ''}</span>
            <span>{cartTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
          </button>
        </div>
      )}

      {(showCart || step === 'checkout') && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: bg + 'f2', backdropFilter: 'blur(4px)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#333' }}>
            <button onClick={() => { setShowCart(false); if (step === 'checkout') setStep('menu'); }} className="p-1" style={{ color: '#8a8275' }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold" style={{ color: '#e8e0d4' }}>{step === 'checkout' ? 'Confirmar pedido' : 'Tu pedido'}</h2>
            <button onClick={() => setCart([])} className="text-xs" style={{ color: '#b05e5e' }}>Vaciar</button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {cart.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" style={{ color: '#6b655a' }} />
                <p className="text-sm" style={{ color: '#6b655a' }}>Carrito vacío</p>
              </div>
            )}
            {cart.map(item => (
              <div key={item.productId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#222' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#e8e0d4' }}>{item.name}</p>
                  <p className="text-xs" style={{ color: theme.primary }}>{(item.price * item.qty).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: theme.primary + '20', color: theme.primary }}>
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-bold w-5 text-center" style={{ color: '#e8e0d4' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: theme.primary, color: '#000' }}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {cart.length > 0 && step === 'checkout' && (
            <div className="p-4 border-t space-y-3 overflow-y-auto" style={{ borderColor: '#333', maxHeight: '55vh' }}>
              <div className="flex gap-2">
                {modes.includes('delivery') && (
                  <button onClick={() => setModality('delivery')}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium"
                    style={{ background: modality === 'delivery' ? theme.primary + '25' : '#222', color: modality === 'delivery' ? theme.primary : '#8a8275', border: `1px solid ${modality === 'delivery' ? theme.primary : '#333'}` }}>
                    <Truck className="w-3 h-3" /> Domicilio
                  </button>
                )}
                {modes.includes('pickup') && (
                  <button onClick={() => setModality('pickup')}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium"
                    style={{ background: modality === 'pickup' ? theme.primary + '25' : '#222', color: modality === 'pickup' ? theme.primary : '#8a8275', border: `1px solid ${modality === 'pickup' ? theme.primary : '#333'}` }}>
                    <Store className="w-3 h-3" /> Recogida
                  </button>
                )}
              </div>

              {modality === 'delivery' && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>Dirección</label>
                  <input type="text" value={address} onChange={e => {
                    setAddress(e.target.value);
                    setSelectedZone(findZone(e.target.value));
                  }} placeholder="Calle, número, piso, ciudad"
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
                  {selectedZone && (
                    <p className="text-[10px] mt-1" style={{ color: theme.primary }}>
                      {selectedZone.name} — Envío: {selectedZone.cost} € ({selectedZone.estimatedMinutes} min)
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>¿Cuándo?</label>
                <div className="flex gap-2">
                  <button onClick={() => setScheduledTime('now')}
                    className="flex-1 py-2 rounded-lg text-xs font-medium"
                    style={{ background: scheduledTime === 'now' ? theme.primary + '25' : '#222', color: scheduledTime === 'now' ? theme.primary : '#8a8275', border: `1px solid ${scheduledTime === 'now' ? theme.primary : '#333'}` }}>
                    <Clock className="w-3 h-3 inline mr-1" />Lo antes posible
                  </button>
                  <button onClick={() => setScheduledTime('later')}
                    className="flex-1 py-2 rounded-lg text-xs font-medium"
                    style={{ background: scheduledTime === 'later' ? theme.primary + '25' : '#222', color: scheduledTime === 'later' ? theme.primary : '#8a8275', border: `1px solid ${scheduledTime === 'later' ? theme.primary : '#333'}` }}>
                    <Clock className="w-3 h-3 inline mr-1" />Programar
                  </button>
                </div>
                {scheduledTime === 'later' && (
                  <input type="datetime-local" value={scheduledHour} onChange={e => setScheduledHour(e.target.value)}
                    className="w-full mt-2 rounded-lg px-3 py-2 text-sm"
                    style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>Nombre *</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>Teléfono *</label>
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>Email</label>
                <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
              </div>

              {error && <p className="text-xs" style={{ color: '#b05e5e' }}>{error}</p>}

              <div className="flex items-center justify-between text-sm font-bold py-2">
                <span style={{ color: '#e8e0d4' }}>Total</span>
                <span style={{ color: theme.primary }}>{(cartTotal + (modality === 'delivery' ? (selectedZone?.cost || 0) : 0)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              <button onClick={handlePlaceOrder} disabled={submitting || !customerName || !customerPhone}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-80 disabled:opacity-40"
                style={{ background: theme.primary, color: '#000' }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Enviando…' : paymentRequired ? 'Pagar y confirmar' : 'Confirmar pedido'}
              </button>
            </div>
          )}

          {cart.length > 0 && step !== 'checkout' && (
            <div className="p-4 border-t" style={{ borderColor: '#333' }}>
              <button onClick={() => setStep('checkout')}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-between px-4 hover:opacity-80"
                style={{ background: theme.primary, color: '#000' }}>
                <span>Continuar</span>
                <span>{cartTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

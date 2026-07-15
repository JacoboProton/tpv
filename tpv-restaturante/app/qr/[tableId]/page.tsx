'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Minus, ShoppingCart, X, Clock, Bell, ChevronLeft, Check, Loader2, AlertTriangle } from 'lucide-react';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  notes: string;
  modifiers: unknown[];
  course: string;
}

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

interface BuffetSession {
  round: number;
  cooldown_until: number;
  override_round_cap: number;
  adult_count: number;
  child_count: number;
  senior_count: number;
}

interface BuffetConfig {
  paused_until: number;
  round_cap: number;
}

interface Settings {
  qrThemePrimary?: string;
  qrThemeSecondary?: string;
  qrThemeLogo?: string;
}

export default function QrMenuPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const router = useRouter();
  const [catalog, setCatalog] = useState<Record<string, unknown> | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [buffetSession, setBuffetSession] = useState<BuffetSession | null>(null);
  const [buffetConfig, setBuffetConfig] = useState<BuffetConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [orderResult, setOrderResult] = useState<Record<string, unknown> | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  const isBuffet = !!buffetSession;
  const isPaused = (buffetConfig?.paused_until || 0) > Date.now();
  const pauseRemaining = isPaused ? (buffetConfig?.paused_until || 0) - Date.now() : 0;
  const cooldownUntil = isBuffet ? (buffetSession?.cooldown_until || 0) : 0;
  const inCooldown = cooldownUntil > Date.now();
  const cooldownRemaining = inCooldown ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const roundCap = isBuffet
    ? ((buffetSession?.override_round_cap || 0) > 0 ? (buffetSession?.override_round_cap || 0) : (buffetConfig?.round_cap || 3))
    : 99;
  const totalPeople = isBuffet ? ((buffetSession?.adult_count || 0) + (buffetSession?.child_count || 0) + (buffetSession?.senior_count || 0)) : 1;
  const maxItems = roundCap * totalPeople;

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
      fetch(`/api/buffet?scope=table_session&tableId=${tableId}`).then(r => r.json()),
    ]).then(([cat, s, buffet]) => {
      const catData = cat as Record<string, unknown>;
      setCatalog(catData);
      setSettings(s as Settings);
      const cats = catData.categories as unknown[];
      if (cats?.length > 0) setActiveCategory((cats[0] as Record<string, unknown>).id as string);
      if (buffet?.session) {
        setBuffetSession(buffet.session as BuffetSession);
        setBuffetConfig(buffet.config as BuffetConfig);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tableId]);

  useEffect(() => {
    if (isBuffet) {
      const iv = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(iv);
    }
  }, [isBuffet]);

  const visibleProducts: Product[] = useMemo(() => {
    if (!catalog) return [];
    const catMap: Record<string, Category> = {};
    for (const c of (catalog.categories as Category[] || [])) catMap[c.name] = c;
    return ((catalog.products as Product[] || [])).filter(p => {
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

  const theme: { primary: string; secondary: string; logo: string } = {
    primary: settings?.qrThemePrimary || '#c4a04a',
    secondary: settings?.qrThemeSecondary || '#1a1a1a',
    logo: settings?.qrThemeLogo || '',
  };

  function addToCart(product: Product) {
    if (isBuffet && cartCount >= maxItems) return;
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (isBuffet && prev.reduce((s, i) => s + i.qty, 0) >= maxItems) return prev;
        return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: isBuffet ? 0 : Number(product.price),
        qty: 1,
        notes: '',
        modifiers: [],
        course: product.course || '',
      }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.productId !== productId);
      if (isBuffet && delta > 0 && prev.reduce((s, i) => s + i.qty, 0) >= maxItems) return prev;
      return prev.map(i => i.productId === productId ? { ...i, qty: newQty } : i);
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }

  const cartTotal: number = useMemo(() => {
    if (isBuffet) return 0;
    return cart.reduce((s, i) => s + i.price * i.qty, 0);
  }, [cart, isBuffet]);
  const cartCount: number = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');

    try {
      if (isBuffet) {
        const r = await fetch('/api/buffet', {
          method: 'POST',
          body: JSON.stringify({ action: 'create_round', tableId, items: cart }),
        });
        const data = await r.json() as { roundId?: string; round?: number; cooldownUntil?: number; error?: string };
        if (data.roundId) {
          setOrderResult({ ok: true, round: data.round });
          setCart([]);
          setShowCheckout(false);
          setShowCart(false);
          setBuffetSession(prev => (prev ? { ...prev, round: data.round || prev.round, cooldown_until: data.cooldownUntil || prev.cooldown_until } : prev));
        } else {
          setError(data.error || 'Error al enviar la ronda');
        }
      } else {
        const r = await fetch('/api/qr-order', {
          method: 'POST',
          body: JSON.stringify({
            tableId, items: cart, amount: cartTotal,
            customerName, customerPhone, notes,
          }),
        });
        const data = await r.json() as { ok?: boolean; orderId?: string; error?: string };
        if (data.ok) {
          setOrderResult(data as unknown as Record<string, unknown>);
          setCart([]);
          setShowCheckout(false);
          setShowCart(false);
        } else {
          setError(data.error || 'Error al enviar el pedido');
        }
      }
    } catch {
      setError('Error de conexión');
    }
    setSubmitting(false);
  }

  async function handleCallWaiter() {
    try {
      await fetch('/api/qr-calls', { method: 'POST', body: JSON.stringify({ tableId, tableName: tableId }) });
      alert('¡Aviso enviado! Un camarero vendrá enseguida.');
    } catch {}
  }

  function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const bg = theme.secondary;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.primary }} />
      </div>
    );
  }

  if (orderResult) {
    if (isBuffet) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: bg }}>
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: theme.primary + '30' }}>
              <Check className="w-8 h-8" style={{ color: theme.primary }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#e8e0d4' }}>¡Ronda enviada!</h1>
            <p className="text-sm" style={{ color: '#8a8275' }}>
              Ronda {orderResult.round as string} — la cocina está preparándolo.{inCooldown ? '' : ' Podrás pedir otra ronda en unos minutos.'}
            </p>
            <button onClick={() => setOrderResult(null)}
              className="w-full py-3 rounded-lg text-sm font-bold hover:opacity-80"
              style={{ background: theme.primary, color: '#000' }}>
              Seguir pidiendo
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: bg }}>
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: theme.primary + '30' }}>
            <Check className="w-8 h-8" style={{ color: theme.primary }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#e8e0d4' }}>¡Pedido enviado!</h1>
          <p className="text-sm" style={{ color: '#8a8275' }}>Tu pedido está en cocina. Puedes seguir su estado en vivo.</p>
          <button onClick={() => router.push(`/qr/${tableId}/order/${orderResult.orderId as string}`)}
            className="w-full py-3 rounded-lg text-sm font-bold hover:opacity-80"
            style={{ background: theme.primary, color: '#000' }}>
            Ver estado del pedido
          </button>
          <button onClick={() => setOrderResult(null)}
            className="w-full py-2 rounded-lg text-xs hover:opacity-80"
            style={{ background: '#333', color: '#8a8275' }}>
            Seguir pidiendo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: bg, paddingBottom: '80px' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-md" style={{ background: bg + 'e6', borderBottom: '1px solid #333' }}>
        {isBuffet && (
          <div style={{ background: theme.primary + '20', borderBottom: '1px solid ' + theme.primary + '40' }} className="px-4 py-2">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: theme.primary }} className="font-bold">
                🍽️ Buffet · Ronda {(buffetSession?.round || 0) + 1}
              </span>
              <span style={{ color: '#8a8275' }}>
                {(buffetSession?.adult_count || 0) + (buffetSession?.child_count || 0) + (buffetSession?.senior_count || 0)} comensales
                {(buffetSession?.child_count || 0) > 0 && ` · ${buffetSession?.child_count} 🛝`}
                {(buffetSession?.senior_count || 0) > 0 && ` · ${buffetSession?.senior_count} 👴`}
              </span>
            </div>
          </div>
        )}

        {isPaused && (
          <div style={{ background: '#722f37', color: '#e8dcc8' }} className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            Buffet en pausa — vuelve en {formatTime(pauseRemaining)}
          </div>
        )}
        {inCooldown && !isPaused && (
          <div style={{ background: '#b8860b30', color: '#d4a843' }} className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            Puedes pedir otra ronda en {formatTime(cooldownRemaining)}
          </div>
        )}
        {isBuffet && maxItems > 0 && cartCount > 0 && !inCooldown && !isPaused && (
          <div className="px-4 pb-1">
            <div style={{ background: '#333' }} className="h-1 rounded-full overflow-hidden">
              <div style={{
                background: theme.primary,
                width: Math.min(100, (cartCount / maxItems) * 100) + '%',
                height: '100%',
                borderRadius: 999,
                transition: 'width 0.3s',
              }} />
            </div>
            <p className="text-[10px] mt-0.5 text-right" style={{ color: '#6b655a' }}>{cartCount}/{maxItems}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {settings?.qrThemeLogo && (
              <img src={settings.qrThemeLogo} alt="Logo" className="h-8 w-auto" />
            )}
            {!settings?.qrThemeLogo && (
              <span className="font-bold text-lg" style={{ color: '#e8e0d4' }}>Carta</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCallWaiter}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
              style={{ background: theme.primary + '20', color: theme.primary }}>
              <Bell className="w-3.5 h-3.5" /> Llamar
            </button>
            <button onClick={() => setShowCart(true)} className="relative p-2 rounded-lg hover:opacity-80" style={{ background: theme.primary + '20' }}>
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

        <div className="flex overflow-x-auto gap-1 px-4 pb-2 scrollbar-none">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: activeCategory === cat.id ? theme.primary + '30' : '#333',
                color: activeCategory === cat.id ? theme.primary : '#8a8275',
              }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {isPaused && (
        <div className="px-4 py-12 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: theme.primary }} />
          <p className="text-lg font-bold mb-1" style={{ color: '#e8e0d4' }}>Estamos terminando la ronda anterior</p>
          <p className="text-sm" style={{ color: '#8a8275' }}>Vuelve en {formatTime(pauseRemaining)} para pedir. Si ya tienes comida, ¡sigue disfrutando!</p>
        </div>
      )}

      {!isPaused && (
        <div className="px-4 py-3 space-y-4">
          {categories.map(cat => {
            if (activeCategory && cat.id !== activeCategory) return null;
            const products = visibleProducts.filter(p => p.category === cat.name);
            if (products.length === 0) return null;
            return (
              <div key={cat.id}>
                <h2 className="text-sm font-bold mb-2" style={{ color: '#e8e0d4' }}>{cat.name}</h2>
                <div className="space-y-2">
                  {products.map(p => {
                    const canAdd = isBuffet ? (!inCooldown && cartCount < maxItems) : true;
                    return (
                      <div key={p.id} onClick={() => canAdd && addToCart(p)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-transform ${!canAdd ? 'opacity-50' : ''}`}
                        style={{ background: '#222' }}>
                        {p.image && (
                          <img src={p.image} alt={p.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#e8e0d4' }}>{p.name}</p>
                          {p.description && <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: '#6b655a' }}>{p.description}</p>}
                          {!isBuffet && (
                            <p className="text-sm font-bold mt-1" style={{ color: theme.primary }}>{Number(p.price).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                          )}
                        </div>
                        {canAdd && (
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cartCount > 0 && !isPaused && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4" style={{ background: bg + 'f2', borderTop: '1px solid #333', backdropFilter: 'blur(8px)' }}>
          <button onClick={() => setShowCart(true)}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-between px-4"
            style={{ background: theme.primary, color: '#000' }}>
            <span>{cartCount} producto{cartCount !== 1 ? 's' : ''}</span>
            {!isBuffet && <span>{cartTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>}
            {isBuffet && <span>Ronda {(buffetSession?.round || 0) + 1}</span>}
          </button>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: bg + 'f2', backdropFilter: 'blur(4px)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#333' }}>
            <button onClick={() => setShowCart(false)} className="p-1" style={{ color: '#8a8275' }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold" style={{ color: '#e8e0d4' }}>
              {isBuffet ? `Ronda ${(buffetSession?.round || 0) + 1}` : 'Tu pedido'}
            </h2>
            <button onClick={() => setCart([])} className="text-xs" style={{ color: '#b05e5e' }}>Vaciar</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {cart.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" style={{ color: '#6b655a' }} />
                <p className="text-sm" style={{ color: '#6b655a' }}>Añade productos para esta ronda</p>
              </div>
            )}
            {cart.map(item => (
              <div key={item.productId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#222' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#e8e0d4' }}>{item.name}</p>
                  {!isBuffet && (
                    <p className="text-xs" style={{ color: theme.primary }}>{(item.price * item.qty).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                  )}
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
          {cart.length > 0 && (
            <div className="p-4 border-t space-y-3" style={{ borderColor: '#333' }}>
              {isBuffet ? (
                <>
                  {error && <p className="text-xs" style={{ color: '#b05e5e' }}>{error}</p>}
                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-80"
                    style={{ background: theme.primary, color: '#000' }}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {submitting ? 'Enviando...' : `Enviar ronda (${cartCount} platos)`}
                  </button>
                </>
              ) : (
                <>
                  {showCheckout ? (
                    <>
                      <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                        placeholder="Tu nombre (opcional)"
                        className="w-full rounded-lg px-3 py-2 text-sm"
                        style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
                      <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="Teléfono (opcional)"
                        className="w-full rounded-lg px-3 py-2 text-sm"
                        style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
                      <textarea value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Notas para cocina (alergias, preferencias...)"
                        rows={2}
                        className="w-full rounded-lg px-3 py-2 text-sm"
                        style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
                      {error && <p className="text-xs" style={{ color: '#b05e5e' }}>{error}</p>}
                      <button onClick={handleSubmit} disabled={submitting}
                        className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-80"
                        style={{ background: theme.primary, color: '#000' }}>
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {submitting ? 'Enviando...' : `Enviar pedido — ${cartTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`}
                      </button>
                      <button onClick={() => setShowCheckout(false)} className="w-full py-2 text-xs" style={{ color: '#6b655a' }}>
                        Volver
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span style={{ color: '#e8e0d4' }}>Total</span>
                        <span style={{ color: theme.primary }}>{cartTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                      <button onClick={() => setShowCheckout(true)}
                        className="w-full py-3 rounded-xl text-sm font-bold hover:opacity-80"
                        style={{ background: theme.primary, color: '#000' }}>
                        Confirmar pedido
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

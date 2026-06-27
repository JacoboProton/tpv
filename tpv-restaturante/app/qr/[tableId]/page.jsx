'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Minus, ShoppingCart, X, Clock, Bell, ChevronLeft, Check, Loader2 } from 'lucide-react';

export default function QrMenuPage() {
  const { tableId } = useParams();
  const router = useRouter();
  const [catalog, setCatalog] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([cat, s]) => {
      setCatalog(cat);
      setSettings(s);
      if (cat?.categories?.length > 0) setActiveCategory(cat.categories[0].id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Filter products visible on QR
  const visibleProducts = useMemo(() => {
    if (!catalog) return [];
    const catMap = {};
    for (const c of catalog.categories || []) catMap[c.name] = c;
    return (catalog.products || []).filter(p => {
      if (p.active === false || p.show_qr === false || p.agotado === true) return false;
      const cat = catMap[p.category];
      if (!cat || cat.active === false || cat.show_qr === false) return false;
      return true;
    });
  }, [catalog]);

  const categories = useMemo(() => {
    if (!catalog) return [];
    return (catalog.categories || []).filter(c => {
      if (c.active === false || c.show_qr === false) return false;
      return visibleProducts.some(p => p.category === c.name);
    });
  }, [catalog, visibleProducts]);

  const theme = {
    primary: settings?.qrThemePrimary || '#c4a04a',
    secondary: settings?.qrThemeSecondary || '#1a1a1a',
    logo: settings?.qrThemeLogo || '',
  };

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        qty: 1,
        notes: '',
        modifiers: [],
        course: product.course || '',
      }];
    });
  }

  function updateQty(productId, delta) {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.productId !== productId);
      return prev.map(i => i.productId === productId ? { ...i, qty: newQty } : i);
    });
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/qr-order', {
        method: 'POST',
        body: JSON.stringify({
          tableId,
          items: cart,
          amount: cartTotal,
          customerName,
          customerPhone,
          notes,
        }),
      });
      const data = await r.json();
      if (data.ok) {
        setOrderResult(data);
        setCart([]);
        setShowCheckout(false);
        setShowCart(false);
      } else {
        setError(data.error || 'Error al enviar el pedido');
      }
    } catch {
      setError('Error de conexión');
    }
    setSubmitting(false);
  }

  async function handleCallWaiter() {
    try {
      const tableName = tableId;
      await fetch('/api/qr-calls', {
        method: 'POST',
        body: JSON.stringify({ tableId, tableName }),
      });
      alert('¡Aviso enviado! Un camarero vendrá enseguida.');
    } catch {}
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: bg }}>
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: theme.primary + '30' }}>
            <Check className="w-8 h-8" style={{ color: theme.primary }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#e8e0d4' }}>¡Pedido enviado!</h1>
          <p className="text-sm" style={{ color: '#8a8275' }}>Tu pedido está en cocina. Puedes seguir su estado en vivo.</p>
          <button onClick={() => router.push(`/qr/${tableId}/order/${orderResult.orderId}`)}
            className="w-full py-3 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity"
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

        {/* Category tabs */}
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

      {/* Products */}
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
                    {p.image && (
                      <img src={p.image} alt={p.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    )}
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
                          <span className="text-sm font-bold w-5 text-center" style={{ color: '#e8e0d4' }}>{cart.find(i => i.productId === p.id).qty}</span>
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

      {/* Cart bottom bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4" style={{ background: bg + 'f2', borderTop: '1px solid #333', backdropFilter: 'blur(8px)' }}>
          <button onClick={() => setShowCart(true)}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-between px-4"
            style={{ background: theme.primary, color: '#000' }}>
            <span>{cartCount} producto{cartCount !== 1 ? 's' : ''}</span>
            <span>{cartTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: bg + 'f2', backdropFilter: 'blur(4px)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#333' }}>
            <button onClick={() => setShowCart(false)} className="p-1" style={{ color: '#8a8275' }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold" style={{ color: '#e8e0d4' }}>Tu pedido</h2>
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
          {cart.length > 0 && (
            <div className="p-4 border-t space-y-3" style={{ borderColor: '#333' }}>
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
                    placeholder="Notas para cocina (alergias, preferencias…)"
                    rows={2}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }} />
                  {error && <p className="text-xs" style={{ color: '#b05e5e' }}>{error}</p>}
                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-80"
                    style={{ background: theme.primary, color: '#000' }}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {submitting ? 'Enviando…' : `Enviar pedido — ${cartTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import Script from 'next/script';
import {
  ALLERGENS,
  ALLERGEN_COLORS,
  euros,
  THEMES,
} from '@/components/constants';
import type { Theme } from '@/components/constants';
import {
  CalendarClock,
  Flame,
  Info,
  Plus,
  Utensils,
  Beer,
  Coffee,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import ModifierSelector from '@/components/ModifierSelector';
import { seedModifierGroups, DEFAULT_PRODUCT_MODIFIERS } from '@/lib/modifiers';

const C: Theme = THEMES.dark;

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  active?: boolean;
  show_qr?: boolean;
  agotado?: boolean;
  image?: string;
  description?: string;
  allergens?: string[];
  featured?: boolean;
  course?: string;
}

interface Category {
  id: string;
  name: string;
  active?: boolean;
  show_qr?: boolean;
}

interface Offer {
  active: boolean;
  days: number[];
  startHour: number;
  endHour: number;
  type?: string;
  fixedPrice?: number;
  name?: string;
  discountPct?: number;
  productIds?: string[];
}

interface Catalog {
  products: Product[];
  categories: Category[];
  combos?: Combo[];
}

interface ComboSlot {
  id: string;
  name: string;
  minChoices: number;
  maxChoices: number;
  items: ComboItem[];
}

interface ComboItem {
  id: string;
  product_id: string;
  surcharge?: number;
  quantity?: number;
}

interface Combo {
  id: string;
  name: string;
  price: number;
  description?: string;
  active?: boolean;
  discountPct?: number;
  slots?: ComboSlot[];
  items?: ComboItem[];
}

function isQrVisible(p: Product, categories: Category[]): boolean {
  if (p.active === false || p.show_qr === false || p.agotado === true) return false;
  const cat = categories.find(c => c.name === p.category);
  if (!cat || cat.active === false || cat.show_qr === false) return false;
  return true;
}

function getActiveOffer(offers: Offer[]): Offer | null {
  if (!offers || offers.length === 0) return null;
  const now = new Date();
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  const hour = now.getHours();
  return offers.find(o => o.active && o.days.includes(dow) && hour >= o.startHour && hour < o.endHour) || null;
}

export default function MenuPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [offersData, setOffersData] = useState<Offer[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showModifiers, setShowModifiers] = useState<Product | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog').then(r => r.json() as Promise<Catalog>),
      fetch('/api/offers').then(r => r.json().catch(() => []) as Promise<Offer[]>),
    ]).then(([cat, off]) => {
      setCatalog(cat);
      setOffersData(off || []);
      if (cat?.categories?.length) setActiveCategory(null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const offer = getActiveOffer(offersData);
      if (offer?.type === 'menu_del_dia') {
        const now = new Date();
        const end = new Date();
        end.setHours(offer.endHour, 0, 0, 0);
        const diff = end.getTime() - now.getTime();
        if (diff > 0) {
          const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
          const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
          const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
          setTimeLeft(`${h}:${m}:${s}`);
        } else {
          setTimeLeft("");
        }
      } else {
        setTimeLeft("");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [offersData]);

  const activeOffer = useMemo(() => getActiveOffer(offersData), [offersData]);

  const qrVisibleProducts = useMemo(() => {
    if (!catalog) return [];
    return catalog.products.filter(p => isQrVisible(p, catalog.categories));
  }, [catalog]);

  const featuredProducts = useMemo(() => {
    return qrVisibleProducts.filter(p => p.featured);
  }, [qrVisibleProducts]);

  const activeOfferProducts = useMemo(() => {
    if (!activeOffer) return [];
    const ids = activeOffer.productIds || [];
    return qrVisibleProducts.filter(p => ids.includes(p.id));
  }, [activeOffer, qrVisibleProducts]);

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    qrVisibleProducts.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  }, [qrVisibleProducts]);

  const qrCategories = useMemo(() => {
    if (!catalog) return [];
    return catalog.categories.filter(c => c.active !== false && c.show_qr !== false);
  }, [catalog]);

  const combos = useMemo(() => {
    return catalog?.combos?.filter(c => c.active) || [];
  }, [catalog]);

  const jsonLd = useMemo(() => {
    if (!catalog) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'Sonora',
      description: 'Menú digital moderno y cinemático.',
      servesCuisine: 'Española / Fusión',
      hasMenu: {
        '@type': 'Menu',
        name: 'Carta Sonora',
        hasMenuSection: qrCategories.map(cat => ({
          '@type': 'MenuSection',
          name: cat.name,
          hasMenuItem: (productsByCategory[cat.name] || []).map(p => ({
            '@type': 'MenuItem',
            name: p.name,
            description: p.description || '',
            offers: { '@type': 'Offer', price: p.price, priceCurrency: 'EUR' },
          })),
        })),
      },
    };
  }, [catalog, productsByCategory, qrCategories]);

  if (!catalog) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1d23]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-0.5 bg-[#c4a04a] animate-pulse" />
          <p className="text-[#9c958a] font-mono uppercase tracking-[0.3em] text-[10px]">Cargando Sonora</p>
        </div>
      </div>
    );
  }

  const modifierGroups = seedModifierGroups();

  return (
    <div className="relative min-h-screen bg-[#1a1d23] text-white font-sans pb-32 overflow-x-hidden">
      {jsonLd && (
        <Script
          id="schema-restaurant"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <header className="relative h-80 w-full overflow-hidden">
        <video
          src="https://videos.pexels.com/video-files/4765778/4765778-hd_1280_720_25fps.mp4"
          poster="https://images.pexels.com/videos/4765778/club-drink-drinks-night-4765778.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200"
          autoPlay muted loop playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#1a1d23]" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          <h1 className="text-4xl font-display tracking-[0.4em] uppercase mb-1 text-white drop-shadow-2xl">Sonora</h1>
          <div className="w-16 h-0.5 bg-[#c4a04a] mb-8" />

          {activeOffer?.type === 'menu_del_dia' && activeOffer.fixedPrice && (
            <div className="glass px-5 py-3.5 rounded-2xl flex items-center gap-5 animate-fade-up shadow-2xl border border-white/5">
              <div className="flex flex-col items-start text-left">
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1 font-bold">Menú del Día</span>
                <div className="flex items-center gap-2.5">
                  <CalendarClock className="text-[#c4a04a] w-5 h-5" />
                  <span className="font-mono text-xl font-bold tracking-tight">{timeLeft}</span>
                </div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#b05e5e] mb-1 font-bold">Precio</span>
                <span className="font-mono text-2xl font-bold text-[#c4a04a]">{euros(activeOffer.fixedPrice)}</span>
              </div>
            </div>
          )}

          {activeOffer?.type === 'menu_del_dia' && !activeOffer.fixedPrice && (
            <div className="glass px-5 py-3.5 rounded-2xl flex items-center gap-5 animate-fade-up shadow-2xl border border-white/5">
              <div className="flex flex-col items-start text-left">
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1 font-bold">Menú del Día</span>
                <div className="flex items-center gap-2.5">
                  <CalendarClock className="text-[#c4a04a] w-5 h-5" />
                  <span className="font-mono text-xl font-bold tracking-tight">{timeLeft}</span>
                </div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#b05e5e] mb-1 font-bold">Quedan</span>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#b05e5e] animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-[#b05e5e]/30" />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto">

        {activeOffer?.type === 'happy_hour' && (
          <section className="mt-8 px-6">
            <div className="bg-[#252830] border-l-4 border-[#b05e5e] p-6 rounded-r-2xl relative overflow-hidden group shadow-xl border border-white/5 border-l-[#b05e5e]">
              <div className="absolute top-0 right-0 p-2 opacity-10 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-12">
                <Flame className="w-20 h-20 text-[#b05e5e]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <Flame className="w-3 h-3 text-[#b05e5e]" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#b05e5e]">{activeOffer.name || 'Happy Hour Live'}</h2>
                </div>
                <p className="text-[11px] text-white/40 mb-5 leading-relaxed">
                  {activeOffer.discountPct
                    ? `Disfruta de un ${activeOffer.discountPct}% de descuento en productos seleccionados por tiempo limitado.`
                    : 'Precios especiales por tiempo limitado.'}
                </p>
                {activeOffer.discountPct && (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-[#b05e5e] font-bold mb-0.5 tracking-wider">Dto.</span>
                      <span className="font-mono text-3xl font-bold text-[#b05e5e] price-glow leading-none">-{activeOffer.discountPct}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {featuredProducts.length > 0 && (
          <section className="mt-12">
            <div className="px-6 flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Platos Destacados</h3>
              <div className="h-px flex-1 bg-white/5 ml-6" />
            </div>
            <div className="flex gap-4 overflow-x-auto px-6 pb-8 scrollbar-hide">
              {featuredProducts.map(p => (
                <div
                  key={p.id}
                  className="relative min-w-[280px] h-56 rounded-3xl overflow-hidden group cursor-pointer shadow-2xl shrink-0"
                  onClick={() => setExpandedProduct(expandedProduct === p.id ? null : p.id)}
                >
                  <img src={p.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={p.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5 w-full">
                    <h4 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{p.name}</h4>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-white/60 line-clamp-1 italic font-light tracking-wide">{p.description}</p>
                      <span className="font-mono text-lg font-bold text-[#c4a04a] ml-4 shrink-0">{euros(p.price)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {combos.length > 0 && (
          <section className="mt-12">
            <div className="px-6 flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Combos</h3>
              <div className="h-px flex-1 bg-white/5 ml-6" />
            </div>
            <div className="px-6 grid gap-4">
                {combos.map(combo => {
                const hasSlots = combo.slots && combo.slots.length > 0;
                let minIndividual = 0;
                if (hasSlots) {
                  for (const slot of combo.slots!) {
                    if (!slot.items || slot.items.length === 0) continue;
                    const prices = slot.items
                      .map(item => {
                        const p = catalog.products.find(pr => pr.id === item.product_id);
                        return p ? p.price + (item.surcharge || 0) : 0;
                      })
                      .filter(Boolean)
                      .sort((a, b) => a - b);
                    for (let i = 0; i < (slot.minChoices || 1) && i < prices.length; i++) {
                      minIndividual += prices[i];
                    }
                  }
                } else {
                  minIndividual = (combo.items || []).reduce((s, item) => {
                    const p = catalog.products.find(pr => pr.id === item.product_id);
                    return s + (p?.price || 0) * (item.quantity || 1);
                  }, 0);
                }
                const savings = minIndividual > combo.price ? minIndividual - combo.price : 0;
                return (
                  <div
                    key={combo.id}
                    className="bg-[#252830] rounded-2xl p-5 border border-white/5 hover:border-[#c4a04a]/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-base font-bold uppercase tracking-widest">{combo.name}</h4>
                      <div className="text-right">
                        <span className="font-mono text-lg font-bold text-[#c4a04a]">{euros(combo.price)}</span>
                        {savings > 0 && (
                          <div className="text-[10px] text-[#b05e5e] font-medium">{euros(savings)} de ahorro</div>
                        )}
                      </div>
                    </div>
                    {combo.description && (
                      <p className="text-xs text-white/40 mb-3">{combo.description}</p>
                    )}
                    {(combo.discountPct || 0) > 0 && (
                      <div className="text-[10px] text-[#b05e5e] font-medium mb-2">
                        {combo.discountPct}% de descuento adicional
                      </div>
                    )}
                    {hasSlots ? (
                      <div className="flex flex-col gap-2">
                        {combo.slots!.map(slot => (
                          <div key={slot.id}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">
                              {slot.name} <span className="font-mono text-white/20">({slot.minChoices}-{slot.maxChoices})</span>
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {slot.items.map(item => {
                                const p = catalog.products.find(pr => pr.id === item.product_id);
                                if (!p) return null;
                                return (
                                  <span key={item.id} className="bg-[#1a1d23] rounded-lg px-2 py-1 text-[11px] text-white/60 flex items-center gap-1">
                                    {p.name}
                                    {(item.surcharge || 0) > 0 && <span className="text-[#b05e5e]">+{euros(item.surcharge)}</span>}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(combo.items || []).map((item, ii) => {
                          const p = catalog.products.find(pr => pr.id === item.product_id);
                          if (!p) return null;
                          return (
                            <div key={ii} className="bg-[#1a1d23] rounded-lg px-2.5 py-1.5 text-[11px] text-white/60 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-[#c4a04a]" />
                              {(item.quantity || 1) > 1 && <span className="text-[#c4a04a] font-mono">x{item.quantity}</span>}
                              {p.name}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="px-6 space-y-px mt-10">
          {qrCategories
            .filter(cat => !activeCategory || cat.id === activeCategory)
            .map(cat => (
              <div key={cat.id} className="mb-10 last:mb-0">
                <div className="sticky top-0 z-20 py-4 mb-2 bg-[#1a1d23]/80 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#c4a04a] whitespace-nowrap">{cat.name}</h3>
                    <div className="h-px w-full bg-gradient-to-r from-[#c4a04a]/20 to-transparent" />
                  </div>
                </div>

                <div className="space-y-4">
                  {(productsByCategory[cat.name] || []).map(p => {
                    const hasOffer = activeOfferProducts.some(op => op.id === p.id);
                    return (
                      <div
                        key={p.id}
                        className={`group p-4 rounded-2xl transition-all duration-300 border border-transparent hover:border-white/5 ${expandedProduct === p.id ? 'bg-[#252830] shadow-2xl' : 'bg-transparent'}`}
                        onClick={() => setExpandedProduct(expandedProduct === p.id ? null : p.id)}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                              <h4 className="text-base font-bold group-hover:text-[#c4a04a] transition-colors tracking-tight">{p.name}</h4>
                              <div className="flex gap-1.5">
                                {p.allergens?.map(aid => (
                                  <div
                                    key={aid}
                                    className="w-4 h-4 rounded-full flex items-center justify-center border transition-opacity group-hover:opacity-100 opacity-60"
                                    style={{ borderColor: ALLERGEN_COLORS[aid] + '30', background: ALLERGEN_COLORS[aid] + '10' }}
                                    title={ALLERGENS.find(a => a.id === aid)?.label}
                                  >
                                    <span className="text-[8px] font-black" style={{ color: ALLERGEN_COLORS[aid] }}>
                                      {ALLERGENS.find(a => a.id === aid)?.abbr}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {hasOffer && activeOffer?.type === 'happy_hour' && (
                                <span className="bg-[#b05e5e]/20 text-[#b05e5e] text-[8px] px-1.5 py-0.5 rounded-full font-black tracking-wider">
                                  -{activeOffer.discountPct}%
                                </span>
                              )}
                              {p.featured && (
                                <span className="bg-[#c4a04a]/20 text-[#c4a04a] text-[8px] px-1.5 py-0.5 rounded-full font-black tracking-wider">
                                  DESTACADO
                                </span>
                              )}
                            </div>
                            <p className={`text-xs text-white/40 leading-relaxed transition-all ${expandedProduct === p.id ? '' : 'line-clamp-2'}`}>{p.description || 'Consulta ingredientes con nuestro equipo.'}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="font-mono text-base font-bold text-[#c4a04a] tracking-tight">{euros(p.price)}</span>
                            <button
                              className={`mt-4 w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500 ${expandedProduct === p.id ? 'bg-[#c4a04a] text-black border-[#c4a04a] rotate-90' : 'border-white/10 text-white/40 hover:text-white hover:border-white/30'}`}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                setShowModifiers(p);
                              }}
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${expandedProduct === p.id ? 'max-h-[600px] opacity-100 mt-5' : 'max-h-0 opacity-0'}`}>
                          {p.image && (
                            <div className="relative w-full h-52 rounded-2xl overflow-hidden mb-5 group/img shadow-inner">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/10 group-hover/img:bg-transparent transition-colors" />
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2.5">
                            <div className="glass px-4 py-2.5 rounded-xl flex items-center gap-3 border border-white/5 hover:bg-white/10 transition-colors">
                              <Info className="w-3.5 h-3.5 text-[#b05e5e]" />
                              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/60">Info Alérgenos</span>
                            </div>
                            {(DEFAULT_PRODUCT_MODIFIERS[p.id] as string[] | undefined) && (
                              <button
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowModifiers(p); }}
                                className="glass px-4 py-2.5 rounded-xl flex items-center gap-3 border border-white/5 hover:bg-[#c4a04a]/10 hover:border-[#c4a04a]/30 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5 text-[#c4a04a]" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#c4a04a]">Personalizar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </section>
      </main>

      <footer className="text-center py-20 px-8 border-t border-white/5 mt-16 opacity-20">
        <h2 className="font-display text-2xl tracking-[0.5em] mb-4 text-white">SONORA</h2>
        <p className="text-[9px] uppercase tracking-[0.3em] leading-relaxed">
          Artesanía Culinaria &bull; Experiencia Sonora<br/>
          Calle Falsa 123, Madrid
        </p>
      </footer>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50 animate-fade-up">
        <div className="glass flex justify-between items-center px-2 py-2 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
          <div className="flex items-center gap-1">
            {qrCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                className={`p-3.5 rounded-full transition-all duration-500 relative group ${activeCategory === cat.id ? 'bg-[#c4a04a] text-black shadow-lg shadow-[#c4a04a]/30 scale-110' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
              >
                {cat.name === 'Bebidas' && <Beer className="w-5.5 h-5.5" />}
                {cat.name === 'Tapas' && <Flame className="w-5.5 h-5.5" />}
                {cat.name === 'Principales' && <Utensils className="w-5.5 h-5.5" />}
                {cat.name === 'Postres' && <Coffee className="w-5.5 h-5.5" />}

                {activeCategory === cat.id && (
                   <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#c4a04a] text-black text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest animate-fade-up">
                     {cat.name}
                   </span>
                )}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-white/10 mx-2" />

          <button className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors pl-2 pr-5 py-2 rounded-full border border-white/5 group">
            <div className="w-10 h-10 rounded-full bg-[#b05e5e] flex items-center justify-center shadow-lg shadow-[#b05e5e]/20 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#b05e5e]">Mi Pedido</span>
              <span className="font-mono text-xs font-bold leading-none">0.00€</span>
            </div>
          </button>
        </div>
      </nav>

      {showModifiers && (
        <ModifierSelector
          product={showModifiers}
          modifierGroups={modifierGroups.filter(g => ((DEFAULT_PRODUCT_MODIFIERS[showModifiers.id] as string[] | undefined) || []).includes(g.id))}
          onConfirm={(selected) => {
            console.log('Selected modifiers:', selected);
            setShowModifiers(null);
          }}
          onCancel={() => setShowModifiers(null)}
          colors={C}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from 'react';
import Script from 'next/script';
import { ALLERGENS, ALLERGEN_COLORS, COURSES, euros } from '../../components/constants';

const C = {
  base: '#0f0d0a', surface: '#1a1714', surfaceLight: '#26221e',
  cream: '#efeae0', muted: '#8a8075', line: '#2e2a26',
  brass: '#c9a96e', brassLight: '#e0c898',
  sage: '#7a8b6a', sageLight: '#9eb08a',
  wine: '#6b3a3a', wineLight: '#a06050',
};


export default function MenuPage() {
  const [catalog, setCatalog] = useState(null);
  const [tableId, setTableId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeCourse, setActiveCourse] = useState('all');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('mesa');
    fetch('/api/catalog').then(r => r.json()).then(d => {
      setTableId(tid);
      setCatalog(d);
      if (d?.categories?.length) setActiveCategory(d.categories[0].id);
    }).catch(() => {});
  }, []);

  const jsonLd = useMemo(() => {
    const prods = catalog?.products || [];
    const cats = catalog?.categories || [];
    return {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'La Comanda',
      description: 'Carta digital con productos frescos y de calidad.',
      servesCuisine: 'Española',
      hasMenu: {
        '@type': 'Menu',
        name: 'Carta La Comanda',
        hasMenuSection: cats.map(cat => ({
          '@type': 'MenuSection',
          name: cat.name,
          hasMenuItem: prods
            .filter(p => p.category === cat.name)
            .map(p => ({
              '@type': 'MenuItem',
              name: p.name,
              description: p.description || '',
              offers: {
                '@type': 'Offer',
                price: p.price,
                priceCurrency: 'EUR',
              },
            })),
        })),
      },
    };
  }, [catalog]);

  if (!catalog) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: C.muted }}>Cargando carta...</p>
      </div>
    );
  }

  const products = catalog.products || [];
  const categories = catalog.categories || [];

  const byCategory = {};
  for (const p of products) {
    if (activeCourse !== 'all' && p.course !== activeCourse) continue;
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  }

  function allergenChips(ids) {
    return (ids || []).filter(id => ALLERGENS[id]).map(id => (
      <span
        key={id}
        className="inline-flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-1.5 py-0.5"
        style={{ background: ALLERGEN_COLORS[id] || '#555', color: '#fff', minWidth: 20, height: 16 }}
        title={ALLERGENS[id]}
      >{id.toUpperCase()}</span>
    ));
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px' }}>
      <Script
        id="schema-restaurant"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, color: C.brass }}>LA COMANDA</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
          {tableId ? `Mesa ${tableId.toUpperCase()}` : 'Carta'}
        </p>
      </div>

      {/* Course filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 8, scrollbarWidth: 'none' }}>
        {[{ id: 'all', label: 'Todo' }, ...Object.entries(COURSES).map(([id, label]) => ({ id, label }))].map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCourse(c.id)}
            style={{
              background: activeCourse === c.id ? C.brass : C.surface,
              color: activeCourse === c.id ? C.base : C.muted,
              border: 'none', borderRadius: 20, padding: '6px 16px',
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
            }}
          >{c.label}</button>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              background: activeCategory === cat.id ? C.sage : C.surface,
              color: activeCategory === cat.id ? '#fff' : C.muted,
              border: 'none', borderRadius: 20, padding: '6px 16px',
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
            }}
          >{cat.name}</button>
        ))}
      </div>

      {/* Products */}
      {categories.filter(cat => !activeCategory || cat.id === activeCategory).map(cat => {
        const items = byCategory[cat.name] || [];
        if (items.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: C.brassLight, marginBottom: 8, padding: '0 4px' }}>
              {cat.name}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: C.surface, borderRadius: 12, padding: 12,
                    display: 'flex', gap: 12, alignItems: 'center',
                    border: `1px solid ${C.line}`,
                  }}
                >
                  {p.image && (
                    <img
                      src={p.image}
                      alt={p.name || 'Producto'}
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: C.cream }}>{p.name}</span>
                      {allergenChips(p.allergens)}
                    </div>
                    {p.description && (
                      <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.description}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: C.brass }}>{euros(p.price)}</span>
                      {p.discount > 0 && (
                        <span style={{ fontSize: 11, color: C.wineLight, background: C.wine, padding: '1px 6px', borderRadius: 4 }}>
                          -{p.discount}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ textAlign: 'center', padding: '24px 0 40px', color: C.muted, fontSize: 12 }}>
        La Comanda © {new Date().getFullYear()}
      </div>
    </div>
  );
}

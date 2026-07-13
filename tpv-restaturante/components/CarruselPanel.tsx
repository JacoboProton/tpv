"use client";

import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Save, Star, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { euros } from './constants';
import type { Theme } from './constants';

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  carousel_sort?: number | null;
}

interface Catalog {
  products: CatalogProduct[];
}

interface CarruselPanelProps {
  catalog: Catalog;
  onSave: (data: { id: string; carousel_sort: number | null }[]) => void;
  colors: Theme;
}

const MAX_FEATURED = 8;

export default function CarruselPanel({ catalog, onSave, colors: C }: CarruselPanelProps) {
  const [featured, setFeatured] = useState<CatalogProduct[]>(() => {
    const all = catalog?.products || [];
    return all
      .filter((p: CatalogProduct) => p.carousel_sort !== null && p.carousel_sort !== undefined)
      .sort((a: CatalogProduct, b: CatalogProduct) => (a.carousel_sort || 0) - (b.carousel_sort || 0));
  });

  const available = useMemo(() => {
    const all = catalog?.products || [];
    const featuredIds = new Set(featured.map(p => p.id));
    return all.filter((p: CatalogProduct) => !featuredIds.has(p.id)).sort((a: CatalogProduct, b: CatalogProduct) => a.name.localeCompare(b.name));
  }, [catalog?.products, featured]);

  const moveUp = useCallback((i: number) => {
    if (i <= 0) return;
    setFeatured(prev => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((i: number) => {
    setFeatured(prev => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setFeatured(prev => prev.filter(p => p.id !== id));
  }, []);

  const addProduct = useCallback((product: CatalogProduct) => {
    if (featured.length >= MAX_FEATURED) return;
    setFeatured(prev => [...prev, product]);
  }, [featured.length]);

  function save() {
    const data = featured.map((p, i) => ({ id: p.id, carousel_sort: i + 1 }));
    const allIds = new Set(featured.map(p => p.id));
    const removed = (catalog?.products || [])
      .filter((p: CatalogProduct) => p.carousel_sort !== null && p.carousel_sort !== undefined && !allIds.has(p.id))
      .map((p: CatalogProduct) => ({ id: p.id, carousel_sort: null }));
    onSave([...data, ...removed]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>
          DESTACADOS <span style={{ color: C.muted }} className="text-sm font-normal">({featured.length}/{MAX_FEATURED})</span>
        </h2>
        <button onClick={save}
          style={{ background: C.sage, color: '#fff' }}
          className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90">
          <Save className="w-4 h-4 inline mr-1" /> Guardar carrusel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> Platos disponibles
          </p>
          <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto pr-1">
            {available.length === 0 && (
              <p style={{ color: C.muted }} className="text-xs italic py-4">No hay más platos disponibles o ya tienes {MAX_FEATURED} destacados.</p>
            )}
            {available.map(p => (
              <div key={p.id}
                style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
                className="rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
                <span style={{ color: C.cream }} className="flex-1 truncate">{p.name}</span>
                <span style={{ color: C.muted }} className="font-mono text-xs">{euros(p.price)}</span>
                {featured.length < MAX_FEATURED && (
                  <button onClick={() => addProduct(p)}
                    style={{ color: C.sageLight }}
                    className="text-xs font-medium hover:opacity-80 flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Destacar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Star className="w-3 h-3" style={{ color: C.brassLight }} /> En el carrusel
          </p>
          {featured.length === 0 && (
            <p style={{ color: C.muted }} className="text-xs italic py-4 text-center">
              Selecciona platos de la izquierda para añadirlos al carrusel.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {featured.map((p, i) => (
              <div key={p.id}
                style={{ background: C.surface, border: `1px solid ${C.brass}40` }}
                className="rounded-lg px-3 py-2.5 flex items-center gap-2">
                <GripVertical className="w-4 h-4 shrink-0" style={{ color: C.muted }} />
                <span style={{ color: C.cream }} className="text-sm font-medium flex-1 truncate">{p.name}</span>
                <span style={{ color: C.muted }} className="font-mono text-xs">{euros(p.price)}</span>
                <span style={{ background: C.brass + '20', color: C.brassLight }}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0">#{i + 1}</span>
                <div className="flex gap-0.5">
                  <button onClick={() => moveUp(i)} disabled={i === 0}
                    style={{ color: i === 0 ? C.line : C.muted }}
                    className="p-1 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveDown(i)} disabled={i === featured.length - 1}
                    style={{ color: i === featured.length - 1 ? C.line : C.muted }}
                    className="p-1 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => remove(p.id)} style={{ color: C.wineLight }} className="p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

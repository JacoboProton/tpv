import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, LayoutGrid, ChefHat, ClipboardList, Package, BarChart3, Users, Percent, Star, Euro, Truck, ArrowRight, type LucideIcon } from 'lucide-react';
import type { Theme } from './constants';

const CATEGORY_COLORS: Record<string, string> = {
  'Navegación': '#c4a04a',
  'Mesas': '#7a9a7c',
  'Acciones': '#b05e5e',
};

const ICON_MAP: Record<string, LucideIcon> = {
  salon: LayoutGrid, cocina: ChefHat, comandas: ClipboardList,
  inventario: Package, informes: BarChart3, empleados: Users,
  ofertas: Percent, combos: Package, menus: ChefHat,
  carrusel: Star, precios: Euro, reparto: Truck,
};

interface NavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface FloorTable {
  id: string;
  name: string;
  status: string;
}

interface FloorData {
  tables: FloorTable[];
}

interface Command {
  id: string;
  label: string;
  searchText: string;
  category: string;
  icon: LucideIcon | null;
  badge?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  floor: FloorData | null;
  onSelectTable: (id: string) => void;
  onNavigate: (id: string) => void;
  onAction: (action: string) => void;
  C: Theme;
}

export default function CommandPalette({ isOpen, onClose, navItems, floor, onSelectTable, onNavigate, onAction, C }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => {
    const items: Command[] = [];
    items.push(...navItems.map(item => ({
      id: `nav_${item.id}`, label: `Ir a ${item.label}`,
      searchText: `${item.label} ${item.id}`,
      category: 'Navegación',
      icon: ICON_MAP[item.id] || ArrowRight,
      action: () => onNavigate(item.id),
    })));
    if (floor?.tables) {
      items.push(...floor.tables.map(t => ({
        id: `table_${t.id}`, label: t.name,
        searchText: `${t.name} ${t.id} mesa`,
        category: 'Mesas',
        icon: null,
        badge: t.status,
        action: () => onSelectTable(t.id),
      })));
    }
    items.push(
      { id: 'action_drawer', label: 'Abrir cajón', searchText: 'cajón abrir dinero', category: 'Acciones', icon: null, action: () => onAction('openDrawer') },
      { id: 'action_training', label: 'Activar / desactivar modo formación', searchText: 'formación training practicar', category: 'Acciones', icon: null, action: () => onAction('toggleTraining') },
      { id: 'action_print', label: 'Imprimir ticket actual', searchText: 'imprimir ticket print', category: 'Acciones', icon: null, action: () => onAction('print') },
    );
    return items;
  }, [navItems, floor, onSelectTable, onNavigate, onAction]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(c => c.label.toLowerCase().includes(q) || c.searchText?.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => { if (isOpen) { setQuery(''); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [isOpen]);
  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[selectedIndex]) { e.preventDefault(); filtered[selectedIndex].action(); onClose(); }
    else if (e.key === 'Escape') { onClose(); }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
      style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.line}` }}
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden fade-up">
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: C.muted }} />
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Busca mesas, secciones, acciones..."
            style={{ background: 'transparent', color: C.cream, outline: 'none' }}
            className="flex-1 text-sm" autoComplete="off" spellCheck={false} />
          <kbd style={{ color: C.muted, background: C.surfaceLight, border: `1px solid ${C.line}` }}
            className="text-[10px] px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto" ref={listRef}>
          {filtered.length === 0 ? (
            <p style={{ color: C.muted }} className="text-sm text-center py-10">Sin resultados</p>
          ) : filtered.map((cmd, i) => {
            const catColor = CATEGORY_COLORS[cmd.category] || C.muted;
            const Icon = cmd.icon;
            const isSelected = i === selectedIndex;
            return (
              <button key={cmd.id} onMouseDown={() => { cmd.action(); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
                style={{
                  background: isSelected ? C.surfaceLight : 'transparent',
                  borderLeft: isSelected ? `2px solid ${C.brass}` : '2px solid transparent',
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors">
                {Icon ? (
                  <div style={{ background: catColor + '20', color: catColor }} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                ) : (
                  <div style={{ background: catColor + '20', color: catColor }} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm">
                    {cmd.label.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p style={{ color: C.cream }} className="text-sm truncate">{cmd.label}</p>
                  <p style={{ color: catColor }} className="text-[10px] uppercase tracking-wide">{cmd.category}</p>
                </div>
                {cmd.badge && (
                  <span style={{ color: C.muted }} className="text-[10px] uppercase">{cmd.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

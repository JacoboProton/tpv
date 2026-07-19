import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Lock, Unlock, Undo2, Redo2, Download, Upload, Grid3X3, Columns, Rows,
  Square, Circle, RotateCw, Trash2, Copy, Crop, Settings, Save, X,
} from 'lucide-react';
import { clone } from '@/components/constants';
import type { Theme } from '@/components/constants';

const DEFAULT_CANVAS_W = 1200;
const DEFAULT_CANVAS_H = 800;
const MIN_TABLE_SIZE = 40;
const SNAP_DIST = 8;

interface FloorTable {
  id: string;
  name: string;
  status: string;
  orderId: string | null;
  reserved: unknown | null;
  isFiado: boolean;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  shape: string;
  rotation: number;
  seats: number;
  zone: string;
  layer: number;
  color: string;
}

interface FloorZone {
  id: string;
  name: string;
  color: string;
}

interface FloorData {
  tables: FloorTable[];
  zones?: FloorZone[];
  background?: { url: string; opacity: number } | null;
}

function getShapeStyle(table: FloorTable, zones: FloorZone[], C: Theme) {
  const w = table.width || 80;
  const h = table.height || 80;
  const customColor = table.color || '';
  const zoneColor = table.zone ? zones.find(z => z.id === table.zone)?.color : '';
  const borderColor = customColor || zoneColor || C.brass;
  const bgColor = customColor ? customColor + '22' : (zoneColor ? zoneColor + '22' : C.surfaceLight);

  if (table.shape === 'circle') {
    const r = table.radius || 40;
    return {
      width: r * 2, height: r * 2, borderRadius: '50%',
      background: bgColor, border: `3px solid ${borderColor}`,
    };
  }
  return {
    width: w, height: h, borderRadius: 8,
    background: bgColor, border: `3px solid ${borderColor}`,
  };
}

export default function FloorEditor({ floor, persistFloor, colors: C }: {
  floor: FloorData;
  persistFloor: (f: FloorData) => void;
  colors: Theme;
}) {
  const [locked, setLocked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showProps, setShowProps] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [undoStack, setUndoStack] = useState<FloorData[]>([]);
  const [redoStack, setRedoStack] = useState<FloorData[]>([]);
  const zones: FloorZone[] = floor.zones || [];
  const setZones = (next: FloorZone[]) => {
    const f = clone(floor);
    f.zones = next;
    persistFloor(f);
  };
  const [showZones, setShowZones] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ tableId: string; startX: number; startY: number; initX: number; initY: number; moved: boolean } | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const selectedTable = floor.tables.find(t => t.id === selectedId) || null;

  const pushUndo = useCallback(() => {
    setUndoStack(prev => {
      const next = [...prev, clone(floor)];
      if (next.length > 50) next.shift();
      return next;
    });
    setRedoStack([]);
  }, [floor]);

  const tablesWithDefaults = floor.tables.map(t => ({
    ...t,
    x: t.x ?? 100 + Math.random() * 200,
    y: t.y ?? 100 + Math.random() * 200,
    width: t.width ?? 80,
    height: t.height ?? 80,
    radius: t.radius ?? 40,
    shape: t.shape ?? 'rect',
    rotation: t.rotation ?? 0,
    seats: t.seats ?? 4,
    zone: t.zone ?? '',
    layer: t.layer ?? 0,
    color: t.color ?? '',
  }));

  const handleMouseDown = useCallback((e: React.MouseEvent, tableId: string) => {
    if (locked) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const table = floor.tables.find(t => t.id === tableId);
    if (!table) return;
    const initX = table.x || 0;
    const initY = table.y || 0;
    setSelectedId(tableId);

    dragRef.current = { tableId, startX, startY, initX, initY, moved: false };

    const handleMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      let nx = initX + dx;
      let ny = initY + dy;

      nx = Math.round(nx / SNAP_DIST) * SNAP_DIST;
      ny = Math.round(ny / SNAP_DIST) * SNAP_DIST;

      nx = Math.max(0, nx);
      ny = Math.max(0, ny);

      const next = clone(floor);
      const t = next.tables.find(t => t.id === tableId);
      if (t) {
        t.x = nx;
        t.y = ny;
      }
      persistFloor(next);
      if (dragRef.current) dragRef.current.moved = true;
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (dragRef.current?.moved) pushUndo();
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [locked, floor, zoom, persistFloor, pushUndo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (undoStack.length > 0) {
          const prev = undoStack[undoStack.length - 1];
          setRedoStack(r => [clone(floor), ...r]);
          setUndoStack(u => u.slice(0, -1));
          persistFloor(prev);
        }
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        if (redoStack.length > 0) {
          const next = redoStack[0];
          setUndoStack(u => [...u, clone(floor)]);
          setRedoStack(r => r.slice(1));
          persistFloor(next);
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !(e.target as HTMLElement).closest('input')) {
          e.preventDefault();
          deleteTable(selectedId);
        }
      }
      if (e.ctrlKey && e.key === 'd') {
        if (selectedId) {
          e.preventDefault();
          duplicateTable(selectedId);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack, redoStack, selectedId, floor]);

  function addTable() {
    pushUndo();
    const next = clone(floor);
    const idx = next.tables.length + 1;
    const newTable: FloorTable = {
      id: `t${Date.now()}`,
      name: `Mesa ${idx}`,
      status: 'libre',
      orderId: null,
      reserved: null,
      isFiado: false,
      type: 'mesa',
      x: 100 + (idx % 6) * 120,
      y: 100 + Math.floor(idx / 6) * 120,
      width: 80,
      height: 80,
      radius: 40,
      shape: 'rect',
      rotation: 0,
      seats: 4,
      zone: '',
      layer: 0,
      color: '',
    };
    next.tables.push(newTable);
    persistFloor(next);
    setSelectedId(newTable.id);
  }

  function deleteTable(id: string) {
    pushUndo();
    const next = clone(floor);
    next.tables = next.tables.filter(t => t.id !== id);
    persistFloor(next);
    setSelectedId(null);
  }

  function duplicateTable(id: string) {
    pushUndo();
    const next = clone(floor);
    const src = next.tables.find(t => t.id === id);
    if (!src) return;
    const dup = clone(src);
    dup.id = `t${Date.now()}`;
    dup.name = src.name + ' (copia)';
    dup.x = (src.x || 100) + 40;
    dup.y = (src.y || 100) + 40;
    next.tables.push(dup);
    persistFloor(next);
    setSelectedId(dup.id);
  }

  function updateTableProp(id: string, key: string, value: unknown) {
    const next = clone(floor);
    const t = next.tables.find(t => t.id === id);
    if (t) { (t as unknown as Record<string, unknown>)[key] = value; }
    persistFloor(next);
  }

  function autoArrange() {
    pushUndo();
    const next = clone(floor);
    const cols = Math.ceil(Math.sqrt(next.tables.length));
    const spacingX = 120;
    const spacingY = 120;
    const offsetX = 60;
    const offsetY = 60;
    next.tables.forEach((t, i) => {
      t.x = offsetX + (i % cols) * spacingX;
      t.y = offsetY + Math.floor(i / cols) * spacingY;
    });
    persistFloor(next);
  }

  function generateTemplate(type: string) {
    pushUndo();
    const next = clone(floor);
    next.tables = [];
    const idxBase = 1;

    if (type === 'grid') {
      const rows = 3; const cols = 4;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          next.tables.push({
            id: `t${idxBase + i}`, name: `Mesa ${idxBase + i}`,
            status: 'libre', orderId: null, reserved: null, isFiado: false, type: 'mesa',
            x: 60 + c * 140, y: 60 + r * 140, width: 80, height: 80,
            radius: 40, shape: 'rect', rotation: 0, seats: 4, zone: '', layer: 0, color: '',
          });
        }
      }
    } else if (type === 'perimeter') {
      const positions = [
        [60, 60], [240, 60], [420, 60], [600, 60],
        [600, 240], [600, 420], [420, 420], [240, 420], [60, 420],
        [60, 240],
      ];
      positions.forEach((p, i) => {
        next.tables.push({
          id: `t${idxBase + i}`, name: `Mesa ${idxBase + i}`,
          status: 'libre', orderId: null, reserved: null, isFiado: false, type: 'mesa',
          x: p[0], y: p[1], width: 80, height: 80,
          radius: 40, shape: 'rect', rotation: 0, seats: 4, zone: '', layer: 0, color: '',
        });
      });
    } else if (type === 'u_shape') {
      const uPositions = [[60,60], [200,60], [340,60], [480,60], [620,60], [60,200], [620,200], [60,340], [620,340]];
      uPositions.forEach((p, i) => {
        next.tables.push({
          id: `t${idxBase + i}`, name: `Mesa ${idxBase + i}`,
          status: 'libre', orderId: null, reserved: null, isFiado: false, type: 'mesa',
          x: p[0], y: p[1], width: 80, height: 80,
          radius: 40, shape: 'rect', rotation: 0, seats: 4, zone: '', layer: 0, color: '',
        });
      });
    }

    persistFloor(next);
    setShowTemplates(false);
  }

  function handleBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>) => {
      const next = clone(floor);
      next.background = { url: ev.target?.result as string, opacity: 50 };
      persistFloor(next);
    };
    reader.readAsDataURL(file);
  }

  function handleZoneChange(tableId: string, zoneId: string) {
    pushUndo();
    const next = clone(floor);
    const t = next.tables.find(t => t.id === tableId);
    if (t) t.zone = zoneId;
    persistFloor(next);
  }

  function addZone() {
    const id = 'z' + Date.now();
    pushUndo();
    setZones([...zones, { id, name: 'Nueva zona', color: C.muted }]);
  }

  function updateZone(id: string, key: string, value: string) {
    pushUndo();
    setZones(zones.map(z => z.id === id ? { ...z, [key]: value } : z));
  }

  function deleteZone(id: string) {
    pushUndo();
    const next = clone(floor);
    next.tables.forEach(t => { if (t.zone === id) t.zone = ''; });
    next.zones = zones.filter(z => z.id !== id);
    persistFloor(next);
  }

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setZoom(z => Math.max(0.3, Math.min(3, z + delta)));
    } else {
      setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey) {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const initPan = { ...pan };
      const handleMove = (ev: MouseEvent) => {
        setPan({ x: initPan.x + ev.clientX - startX, y: initPan.y + ev.clientY - startY });
      };
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
  }, [pan]);

  const canvasW = DEFAULT_CANVAS_W * zoom;
  const canvasH = DEFAULT_CANVAS_H * zoom;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ borderBottom: `1px solid ${C.line}` }} className="flex items-center gap-1 sm:gap-2 pb-3 mb-4 flex-wrap overflow-x-auto">
        <button onClick={() => setLocked(!locked)}
          style={{ color: locked ? C.wine : C.muted, background: locked ? C.wineLight + '22' : C.surfaceLight }}
          className="p-2 rounded-lg text-xs flex items-center gap-1.5 hover:opacity-80"
        >
          {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          {locked ? 'Bloqueado' : 'Editar'}
        </button>

        <div style={{ borderLeft: `1px solid ${C.line}` }} className="h-6 mx-1" />

        {!locked && (
          <>
            <button onClick={addTable}
              style={{ color: C.muted, background: C.surfaceLight }}
              className="p-2 rounded-lg text-xs hover:opacity-80"
              title="Añadir mesa"
            >
              <Square className="w-4 h-4" />
            </button>
            <button onClick={() => deleteTable(selectedId!)} disabled={!selectedId}
              style={{ color: C.muted, background: C.surfaceLight, opacity: selectedId ? 1 : 0.4 }}
              className="p-2 rounded-lg text-xs hover:opacity-80"
              title="Eliminar mesa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={() => duplicateTable(selectedId!)} disabled={!selectedId}
              style={{ color: C.muted, background: C.surfaceLight, opacity: selectedId ? 1 : 0.4 }}
              className="p-2 rounded-lg text-xs hover:opacity-80"
              title="Duplicar mesa (Ctrl+D)"
            >
              <Copy className="w-4 h-4" />
            </button>
          </>
        )}

        <div style={{ borderLeft: `1px solid ${C.line}` }} className="h-6 mx-1" />

        <button onClick={() => { pushUndo(); }}
          disabled={undoStack.length === 0}
          style={{ color: C.muted, background: C.surfaceLight, opacity: undoStack.length > 0 ? 1 : 0.4 }}
          className="p-2 rounded-lg text-xs hover:opacity-80" title="Deshacer (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={() => {
          if (redoStack.length > 0) {
            const n = redoStack[0];
            setUndoStack(u => [...u, clone(floor)]);
            setRedoStack(r => r.slice(1));
            persistFloor(n);
          }
        }}
          disabled={redoStack.length === 0}
          style={{ color: C.muted, background: C.surfaceLight, opacity: redoStack.length > 0 ? 1 : 0.4 }}
          className="p-2 rounded-lg text-xs hover:opacity-80" title="Rehacer (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div style={{ borderLeft: `1px solid ${C.line}` }} className="h-6 mx-1" />

        <button onClick={autoArrange}
          style={{ color: C.muted, background: C.surfaceLight }}
          className="p-2 rounded-lg text-xs flex items-center gap-1 hover:opacity-80"
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Auto-ordenar</span>
        </button>

        <button onClick={() => setShowTemplates(!showTemplates)}
          style={{ color: C.muted, background: C.surfaceLight }}
          className="p-2 rounded-lg text-xs flex items-center gap-1 hover:opacity-80"
        >
          <Crop className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Crear plano</span>
        </button>

        <button onClick={() => bgInputRef.current?.click()}
          style={{ color: C.muted, background: C.surfaceLight }}
          className="p-2 rounded-lg text-xs flex items-center gap-1 hover:opacity-80"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Subir plano</span>
        </button>
        <input ref={bgInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleBackgroundUpload} />

        <button onClick={() => setShowZones(!showZones)}
          style={{ color: showZones ? C.brassLight : C.muted, background: C.surfaceLight }}
          className="p-2 rounded-lg text-xs flex items-center gap-1 hover:opacity-80"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Zonas</span>
        </button>

        <div style={{ borderLeft: `1px solid ${C.line}` }} className="h-6 mx-1" />

        {/* Zoom controls */}
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
          style={{ color: C.muted, background: C.surfaceLight }}
          className="p-1.5 rounded-lg text-xs hover:opacity-80"
        >
          −
        </button>
        <span style={{ color: C.muted }} className="text-xs min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))}
          style={{ color: C.muted, background: C.surfaceLight }}
          className="p-1.5 rounded-lg text-xs hover:opacity-80"
        >
          +
        </button>
        <button onClick={() => setZoom(1)}
          style={{ color: C.muted, background: C.surfaceLight }}
          className="p-1.5 rounded-lg text-xs hover:opacity-80"
        >
          <Crop className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Templates panel */}
      {showTemplates && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-4 mb-4 grid grid-cols-3 gap-3"
        >
          <button onClick={() => generateTemplate('grid')}
            style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
            className="p-4 rounded-xl text-center hover:opacity-80"
          >
            <Grid3X3 className="w-8 h-8 mx-auto mb-2" style={{ color: C.muted }} />
            <p className="text-xs font-medium" style={{ color: C.cream }}>Cuadrícula</p>
            <p style={{ color: C.muted }} className="text-xs mt-1">3×4 mesas</p>
          </button>
          <button onClick={() => generateTemplate('perimeter')}
            style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
            className="p-4 rounded-xl text-center hover:opacity-80"
          >
            <Columns className="w-8 h-8 mx-auto mb-2" style={{ color: C.muted }} />
            <p className="text-xs font-medium" style={{ color: C.cream }}>Perímetro</p>
            <p style={{ color: C.muted }} className="text-xs mt-1">10 mesas</p>
          </button>
          <button onClick={() => generateTemplate('u_shape')}
            style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
            className="p-4 rounded-xl text-center hover:opacity-80"
          >
            <Rows className="w-8 h-8 mx-auto mb-2" style={{ color: C.muted }} />
            <p className="text-xs font-medium" style={{ color: C.cream }}>Forma de U</p>
            <p style={{ color: C.muted }} className="text-xs mt-1">9 mesas</p>
          </button>
        </div>
      )}

      {/* Zones panel */}
      {showZones && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-4 mb-4"
        >
          <p className="font-display text-sm mb-3" style={{ color: C.cream }}>Zonas</p>
          <div className="flex flex-col gap-2">
            {zones.map(z => (
              <div key={z.id} className="flex items-center gap-2">
                <input type="color" value={z.color} onChange={e => updateZone(z.id, 'color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer" style={{ border: 'none' }}
                />
                <input type="text" value={z.name} onChange={e => updateZone(z.id, 'name', e.target.value)}
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-sm"
                />
                <button onClick={() => deleteZone(z.id)}
                  style={{ color: C.wineLight }}
                  className="p-1.5 rounded-lg hover:opacity-80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={addZone}
              style={{ color: C.sage, border: `1px dashed ${C.line}` }}
              className="rounded-lg py-2 text-sm hover:opacity-80 mt-1"
            >
              + Añadir zona
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, border: `1px solid ${C.line}` }}>
        <div
          ref={canvasRef}
          onWheel={handleCanvasWheel}
          onMouseDown={handleCanvasMouseDown}
          style={{
            width: '100%', height: 500, overflow: 'hidden', cursor: locked ? 'default' : 'grab',
            background: C.base, position: 'relative',
          }}
        >
          <div style={{
            position: 'absolute', left: pan.x, top: pan.y,
            width: canvasW, height: canvasH, transform: `scale(${zoom})`, transformOrigin: '0 0',
          }}>
            {/* Background image */}
            {floor.background?.url && (
              <img src={floor.background.url} alt="Plano"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'contain', opacity: (floor.background.opacity ?? 50) / 100,
                  pointerEvents: 'none', borderRadius: 4,
                }}
              />
            )}

            {/* Grid background */}
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <defs>
                <pattern id="grid" width={SNAP_DIST * 4} height={SNAP_DIST * 4} patternUnits="userSpaceOnUse">
                  <circle cx={SNAP_DIST * 2} cy={SNAP_DIST * 2} r={0.5} fill={C.line} opacity={0.3} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Tables */}
            {tablesWithDefaults.map(t => {
              const isSelected = t.id === selectedId;
              const shapeStyle = getShapeStyle(t, zones, C);

              return (
                <div
                  key={t.id}
                  onMouseDown={e => handleMouseDown(e, t.id)}
                  onClick={() => { setSelectedId(t.id); setShowProps(true); }}
                  style={{
                    position: 'absolute',
                    left: t.x,
                    top: t.y,
                    cursor: locked ? 'pointer' : 'move',
                    transform: `rotate(${t.rotation || 0}deg)`,
                    zIndex: isSelected ? 100 : (t.layer || 0),
                    transition: dragRef.current ? 'none' : 'box-shadow 0.15s',
                    boxShadow: isSelected
                      ? `0 0 0 3px ${C.brass}, 0 4px 12px rgba(0,0,0,0.3)`
                      : '0 2px 6px rgba(0,0,0,0.2)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600,
                    color: C.cream,
                    userSelect: 'none',
                    ...shapeStyle,
                  }}
                >
                  <span style={{
                    background: isSelected ? C.brass + '33' : 'rgba(0,0,0,0.3)',
                    padding: '2px 6px', borderRadius: 4,
                    fontSize: 9, lineHeight: 1.2,
                    textAlign: 'center',
                    maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.name}
                  </span>
                  {t.seats > 0 && (
                    <span style={{ fontSize: 8, marginTop: 2, opacity: 0.7 }}>
                      {t.seats} plazas
                    </span>
                  )}
                </div>
              );
            })}

            {/* No tables hint */}
            {floor.tables.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 8,
              }}>
                <p style={{ color: C.muted }} className="text-sm">No hay mesas en el plano</p>
                {!locked && (
                  <button onClick={addTable}
                    style={{ background: C.brass, color: C.base }}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Añadir primera mesa
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Properties panel */}
      {showProps && selectedTable && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-4 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div>
            <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">Nombre</label>
            <input type="text" value={selectedTable.name}
              onChange={e => updateTableProp(selectedId!, 'name', e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">Forma</label>
            <select value={selectedTable.shape || 'rect'}
              onChange={e => updateTableProp(selectedId!, 'shape', e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm"
            >
              <option value="rect">Rectángulo</option>
              <option value="circle">Círculo</option>
            </select>
          </div>
          <div>
            <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">Asientos</label>
            <input type="number" min="0" max="20" value={selectedTable.seats || 4}
              onChange={e => updateTableProp(selectedId!, 'seats', parseInt(e.target.value) || 0)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">Color</label>
            <div className="flex gap-2">
              <input type="color" value={selectedTable.color || '#c4a04a'}
                onChange={e => updateTableProp(selectedId!, 'color', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
              {selectedTable.color && (
                <button onClick={() => updateTableProp(selectedId!, 'color', '')}
                  style={{ color: C.muted, background: C.surfaceLight }}
                  className="px-2.5 py-1.5 rounded-lg text-xs"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div>
            <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">Rotación</label>
            <div className="flex items-center gap-2">
              <input type="range" min="0" max="360" value={selectedTable.rotation || 0}
                onChange={e => updateTableProp(selectedId!, 'rotation', parseInt(e.target.value))}
                className="flex-1"
              />
              <span style={{ color: C.muted }} className="text-xs w-8 text-right">{selectedTable.rotation || 0}°</span>
            </div>
          </div>
          <div>
            <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">Zona</label>
            <select value={selectedTable.zone || ''}
              onChange={e => handleZoneChange(selectedId!, e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Sin zona</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">Capa (z-index)</label>
            <input type="number" min="0" max="100" value={selectedTable.layer || 0}
              onChange={e => updateTableProp(selectedId!, 'layer', parseInt(e.target.value) || 0)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">Tamaño (ancho × alto)</label>
            <div className="flex gap-2">
              <input type="number" min="30" max="300" value={selectedTable.width || 80}
                onChange={e => updateTableProp(selectedId!, 'width', parseInt(e.target.value) || 80)}
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-1/2 rounded-lg px-3 py-2 text-sm"
                placeholder="Ancho"
              />
              <input type="number" min="30" max="300" value={selectedTable.height || 80}
                onChange={e => updateTableProp(selectedId!, 'height', parseInt(e.target.value) || 80)}
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-1/2 rounded-lg px-3 py-2 text-sm"
                placeholder="Alto"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={() => { pushUndo(); deleteTable(selectedId!); }}
              style={{ background: C.wine + '33', color: C.wineLight }}
              className="w-full rounded-lg py-2 text-sm font-medium hover:opacity-80"
            >
              Eliminar mesa
            </button>
          </div>
        </div>
      )}

      {/* Background opacity slider */}
      {floor.background?.url && (
        <div className="flex items-center gap-3 mt-3" style={{ color: C.muted }}>
          <label className="text-xs">Opacidad fondo</label>
          <input type="range" min="5" max="100" value={floor.background.opacity ?? 50}
            onChange={e => {
              const next = clone(floor);
              next.background = { url: floor.background!.url, opacity: parseInt(e.target.value) };
              persistFloor(next);
            }}
            className="flex-1 max-w-[200px]"
          />
          <button onClick={() => {
            const next = clone(floor);
            next.background = null;
            persistFloor(next);
          }}
            style={{ color: C.wineLight }}
            className="text-xs hover:opacity-80"
          >
            Quitar fondo
          </button>
        </div>
      )}
    </div>
  );
}

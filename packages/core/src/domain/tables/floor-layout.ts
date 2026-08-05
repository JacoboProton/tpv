import type { Floor, Table, TableType } from '../types'

export type { }

export function normalizeTableFields(tables: Table[]): Table[] {
  return tables.map((t) => {
    if (!t.orderIds && t.orderId) return { ...t, orderIds: [t.orderId] }
    if (!t.orderIds) return { ...t, orderIds: [] }
    return t
  })
}

export function migrateTo3ColumnLayout(floor: Floor): Floor {
  const next: Floor = JSON.parse(JSON.stringify(floor))

  const mesas = next.tables.filter((t) => t.type === 'mesa')
  const barras = next.tables.filter((t) => t.type === 'barra')
  const others = next.tables.filter(
    (t) => t.type !== 'mesa' && t.type !== 'barra' && t.type !== 'llevar' && t.type !== 'domicilio',
  )

  mesas.forEach((t, i) => {
    t.x = 60 + (i % 4) * 140
    t.y = 60 + Math.floor(i / 4) * 140
  })
  for (let i = mesas.length; i < 9; i++) {
    mesas.push(createDefaultTable(`t${i + 1}`, `Mesa ${i + 1}`, 'mesa', 60 + (i % 4) * 140, 60 + Math.floor(i / 4) * 140))
  }

  barras.forEach((t, i) => {
    t.x = 600; t.y = 60 + i * 80; t.width = 140; t.height = 50; t.radius = 25
  })
  for (let i = barras.length; i < 6; i++) {
    const t = createDefaultTable(`t${10 + i}`, `Barra ${i + 1}`, 'barra', 600, 60 + i * 80)
    t.width = 140; t.height = 50; t.radius = 25
    barras.push(t)
  }

  const newDelivery = [
    { id: 't16', name: 'Para llevar', type: 'llevar' as TableType, x: 810, y: 60 },
    { id: 't17', name: 'Domicilio', type: 'domicilio' as TableType, x: 810, y: 140 },
    { id: 't18', name: 'Domicilio 2', type: 'domicilio' as TableType, x: 810, y: 220 },
    { id: 't19', name: 'Domicilio 3', type: 'domicilio' as TableType, x: 810, y: 300 },
  ].map((d) => createDefaultTable(d.id, d.name, d.type, d.x, d.y))

  next.tables = [...mesas, ...barras, ...newDelivery, ...others]
  return next
}

function createDefaultTable(id: string, name: string, type: TableType, x: number, y: number): Table {
  return {
    id, name, status: 'libre', orderId: null, orderIds: [],
    reserved: false, isFiado: false, type,
    x, y, width: 80, height: 80, radius: 40, shape: 'rect',
    rotation: 0, seats: type === 'mesa' ? 4 : 0,
    zone: type === 'mesa' ? 'z1' : type === 'barra' ? 'z3' : '',
    layer: 0, color: '',
  }
}

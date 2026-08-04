import type { Floor } from '../../domain/types.js'

export function countPendingBar(floor: Floor): number {
  return floor?.orders ? Object.values(floor.orders).reduce((s, o) =>
    s + (o.items?.filter((i) => i.sent && !i.ready && i.ubicacion === 'Bar').length ?? 0), 0) : 0
}

export function countPendingCocina(floor: Floor): number {
  return floor?.orders ? Object.values(floor.orders).reduce((s, o) =>
    s + (o.items?.filter((i) => i.sent && !i.ready && i.ubicacion !== 'Bar').length ?? 0), 0) : 0
}

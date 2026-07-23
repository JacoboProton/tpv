export function euros(n: number | null | undefined): string {
  return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function clone<T>(obj: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj))
}

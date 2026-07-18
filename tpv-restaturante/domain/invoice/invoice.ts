export const IGIC_RATE = 0.07

export interface IgicBreakdown {
  baseImponible: number
  cuotaIgic: number
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function calculateBaseImponible(totalConIgic: number): number {
  return round2(totalConIgic / (1 + IGIC_RATE))
}

export function calculateIgic(totalConIgic: number): IgicBreakdown {
  const baseImponible = calculateBaseImponible(totalConIgic)
  return {
    baseImponible,
    cuotaIgic: round2(totalConIgic - baseImponible),
  }
}

export function generateInvoiceNumber(now?: Date): string {
  const d = now || new Date()
  return 'INV-' + d.getFullYear() + '-' + String(d.getTime()).slice(-5)
}

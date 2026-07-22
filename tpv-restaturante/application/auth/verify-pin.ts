import { sha256 } from '@/lib/crypto'

const API_KEY = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY) || ''

export interface VerifiedEmployee {
  id: string
  name: string
  role: string
  personalDiscountEnabled: boolean
  monthlyLimit: number
  monthlyUsed: number
  monthlyUsedMonth: string | null
}

export async function verifyEmployeePin(pin: string): Promise<VerifiedEmployee | null> {
  try {
    const r = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tpv-key': API_KEY },
      body: JSON.stringify({ action: 'verify', pin, pinHash: await sha256(pin) }),
    })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

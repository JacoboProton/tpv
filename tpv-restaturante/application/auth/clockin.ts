import type { CurrentUser } from '@/domain/types'

export interface ClockinDeps {
  fetchSummary: (employeeId: string, date: string) => Promise<{ summary?: unknown }>
  fetchClockin: (body: { employeeId: string; employeeName: string; method: string; action: string }) => Promise<Response>
  showToast: (msg: string) => void
  setClockinSummary: (s: unknown) => void
  setClockinLoading: (v: boolean) => void
}

export async function loadClockinSummary(currentUser: CurrentUser | null, deps: ClockinDeps): Promise<void> {
  if (!currentUser) return
  deps.setClockinLoading(true)
  try {
    const data = await deps.fetchSummary(currentUser.id, new Date().toISOString().slice(0, 10))
    deps.setClockinSummary(data.summary || null)
  } catch {}
  deps.setClockinLoading(false)
}

export async function handleClockinAction(
  currentUser: CurrentUser | null,
  action: string,
  deps: ClockinDeps,
): Promise<void> {
  if (!currentUser) return
  try {
    const r = await deps.fetchClockin({
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      method: 'tpc',
      action,
    })
    const data = await r.json()
    if (data.ok) {
      deps.showToast(`✅ ${action} registrada`)
      loadClockinSummary(currentUser, deps)
    } else {
      deps.showToast('❌ ' + (data.error || 'Error'))
    }
  } catch {
    deps.showToast('❌ Error de conexión')
  }
}

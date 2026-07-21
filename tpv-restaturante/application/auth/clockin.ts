export interface ClockinDeps {
  fetchSummary: (employeeId: string, date: string) => Promise<any>
  fetchClockin: (body: any) => Promise<Response>
  showToast: (msg: string) => void
  setClockinSummary: (s: any) => void
  setClockinLoading: (v: boolean) => void
}

export async function loadClockinSummary(currentUser: any, deps: ClockinDeps) {
  if (!currentUser) return
  deps.setClockinLoading(true)
  try {
    const data = await deps.fetchSummary(currentUser.id, new Date().toISOString().slice(0, 10))
    deps.setClockinSummary(data.summary || null)
  } catch {}
  deps.setClockinLoading(false)
}

export async function handleClockinAction(
  currentUser: any,
  action: string,
  deps: ClockinDeps,
) {
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

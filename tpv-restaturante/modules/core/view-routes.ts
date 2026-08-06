const ROUTE_ALIASES: Record<string, string> = {
  kds: 'cocina-kds',
  waitlist: 'lista-espera',
}

export function routeFor(view: string): string {
  return '/' + (ROUTE_ALIASES[view] ?? view)
}

export function viewFromPath(path: string): string {
  const seg = path.split('/').filter(Boolean)[0]
  if (!seg) return 'salon'
  for (const [v, alias] of Object.entries(ROUTE_ALIASES)) {
    if (alias === seg) return v
  }
  return seg
}
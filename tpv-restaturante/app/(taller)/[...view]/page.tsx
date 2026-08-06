import ViewRouter from '@/modules/core/ViewRouter'
import { viewFromPath } from '@/modules/core/view-routes'

export default async function ViewPage({
  params,
}: {
  params: Promise<{ view?: string[] }>
}) {
  const { view: seg } = await params
  const view = viewFromPath('/' + (seg?.[0] ?? ''))
  return <ViewRouter view={view} />
}
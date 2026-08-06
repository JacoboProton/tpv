'use client'

import { useParams } from 'next/navigation'
import ViewRouter from '@/modules/core/ViewRouter'
import { viewFromPath } from '@/modules/core/view-routes'

export default function ViewPage() {
  const params = useParams<{ view?: string | string[] }>()
  const seg = Array.isArray(params?.view) ? params.view[0] : params?.view
  const view = viewFromPath('/' + (seg ?? ''))
  return <ViewRouter view={view} />
}
"use client"

import { useUi } from '../../modules/core/app-contexts'
import ViewRouter from '../../modules/core/ViewRouter'

export default function TallerPage() {
  const { view } = useUi()
  return <ViewRouter view={view} />
}
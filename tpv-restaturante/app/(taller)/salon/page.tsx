'use client'

import { useFloor, useUi } from '@/modules/core/app-contexts'
import SalonView from '@/modules/salon/SalonView'
import FloorEditor from '@/modules/editor/FloorEditor'

export default function SalonPage() {
  const floorCtx = useFloor()
  const { colors: C } = useUi()
  if (floorCtx.showFloorEditor) {
    return (
      <div>
        <button
          onClick={() => floorCtx.setShowFloorEditor(false)}
          style={{ color: C.muted, background: C.surfaceLight, border: `1px solid ${C.line}` }}
          className="mb-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:opacity-80"
        >
          ← Volver a vista sala
        </button>
        <FloorEditor />
      </div>
    )
  }
  return <SalonView />
}
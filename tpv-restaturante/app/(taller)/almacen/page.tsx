'use client'

import { useCatalog } from '@/modules/core/app-contexts'
import AlmacenMenuView from '@/modules/catalog/AlmacenMenuView'
import AlmacenDetalleView from '@/modules/catalog/AlmacenDetalleView'

export default function AlmacenPage() {
  const { almacenUbicacion } = useCatalog()
  return almacenUbicacion ? <AlmacenDetalleView /> : <AlmacenMenuView />
}
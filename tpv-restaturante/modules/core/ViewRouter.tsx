'use client'
import dynamic from 'next/dynamic'
import { useFloor, useCatalog, useUi } from './app-contexts'

const FloorEditor          = dynamic(() => import('@/modules/editor/FloorEditor'), { ssr: false })
const CocinaView           = dynamic(() => import('@/modules/kitchen/CocinaView'), { ssr: false })
const BarraView            = dynamic(() => import('@/modules/kitchen/BarraView'), { ssr: false })
const KDSView              = dynamic(() => import('@/modules/kitchen/KDSView'), { ssr: false })
const ComandasAbiertasView = dynamic(() => import('@/modules/kitchen/ComandasAbiertasView'), { ssr: false })
const InventarioView        = dynamic(() => import('@/modules/catalog/InventarioView'), { ssr: false })
const CartasView           = dynamic(() => import('@/modules/catalog/CartasView'), { ssr: false })
const AlmacenMenuView      = dynamic(() => import('@/modules/catalog/AlmacenMenuView'), { ssr: false })
const AlmacenDetalleView   = dynamic(() => import('@/modules/catalog/AlmacenDetalleView'), { ssr: false })
const AlbaranesView        = dynamic(() => import('@/modules/catalog/AlbaranesView'), { ssr: false })
const ProduccionView       = dynamic(() => import('@/modules/catalog/ProduccionView'), { ssr: false })
const InformesView         = dynamic(() => import('@/modules/reports/InformesView'), { ssr: false })
const VentasDashboardView  = dynamic(() => import('@/modules/reports/VentasDashboardView'), { ssr: false })
const StockAlertasView     = dynamic(() => import('@/modules/catalog/StockAlertasView'), { ssr: false })
const OfertasPanel         = dynamic(() => import('@/modules/catalog/OfertasPanel'), { ssr: false })
const CombosPanel          = dynamic(() => import('@/modules/catalog/CombosPanel'), { ssr: false })
const MenusDelDiaPanel     = dynamic(() => import('@/modules/catalog/MenusDelDiaPanel'), { ssr: false })
const CarruselPanel        = dynamic(() => import('@/modules/catalog/CarruselPanel'), { ssr: false })
const PreciosPanel         = dynamic(() => import('@/modules/catalog/PreciosPanel'), { ssr: false })
const DeliveryView         = dynamic(() => import('@/modules/orders/DeliveryView'), { ssr: false })
const PedidosView          = dynamic(() => import('@/modules/orders/PedidosView'), { ssr: false })
const FiadosView           = dynamic(() => import('@/modules/orders/FiadosView'), { ssr: false })
const EmpleadosView        = dynamic(() => import('@/modules/employees/EmpleadosView'), { ssr: false })
const GestoriaView         = dynamic(() => import('@/modules/reports/GestoriaView'), { ssr: false })
const PairingPanel         = dynamic(() => import('@/modules/pairing/PairingPanel'), { ssr: false })
const AuditView            = dynamic(() => import('@/modules/admin/AuditView'), { ssr: false })
const TurnosView           = dynamic(() => import('@/modules/employees/TurnosView'), { ssr: false })
const RegistroHorarioView  = dynamic(() => import('@/modules/employees/RegistroHorarioView'), { ssr: false })
const SolicitudesView      = dynamic(() => import('@/modules/admin/SolicitudesView'), { ssr: false })
const PedidosCompraView    = dynamic(() => import('@/modules/admin/PedidosCompraView'), { ssr: false })
const ReservasView         = dynamic(() => import('@/modules/customers/ReservasView'), { ssr: false })
const WaitlistView         = dynamic(() => import('@/modules/customers/WaitlistView'), { ssr: false })
const OnlineOrdersView     = dynamic(() => import('@/modules/orders/OnlineOrdersView'), { ssr: false })
const BuffetKioskView      = dynamic(() => import('@/modules/buffet/BuffetKioskView'), { ssr: false })
const TicketsView          = dynamic(() => import('@/modules/orders/TicketsView'), { ssr: false })
const PaymentsView         = dynamic(() => import('@/modules/payment/PaymentsView'), { ssr: false })
const AccesosView          = dynamic(() => import('@/modules/admin/AccesosView'), { ssr: false })
import SalonView from '@/modules/salon/SalonView'

interface ViewRouterProps {
  view: string
}

export default function ViewRouter({ view }: ViewRouterProps) {
  const floorCtx = useFloor()
  const catalogCtx = useCatalog()
  const ui = useUi()

  const { showFloorEditor, setShowFloorEditor } = floorCtx
  const { almacenUbicacion } = catalogCtx
  const { colors: C } = ui

  return (
    <div className="fade-up" key={view}>
      {view === 'salon' && !showFloorEditor && (
        <SalonView />
      )}
      {view === 'salon' && showFloorEditor && (
        <div>
          <button
            onClick={() => setShowFloorEditor(false)}
            style={{ color: C.muted, background: C.surfaceLight, border: `1px solid ${C.line}` }}
            className="mb-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:opacity-80"
          >
            ← Volver a vista sala
          </button>
          <FloorEditor />
        </div>
      )}
      {view === 'cocina'     && <CocinaView />}
      {view === 'barra'      && <BarraView />}
      {view === 'kds'        && <KDSView />}
      {view === 'comandas'   && <ComandasAbiertasView />}
      {view === 'inventario' && <InventarioView />}
      {view === 'alertas-stock' && <StockAlertasView />}
      {view === 'carta' && (
        <CartasView />
      )}
      {view === 'almacen'    && (almacenUbicacion
        ? <AlmacenDetalleView />
        : <AlmacenMenuView />
      )}
      {view === 'albaranes'  && <AlbaranesView />}
      {view === 'produccion' && <ProduccionView />}
      {view === 'dashboard'  && <VentasDashboardView />}
      {view === 'informes'   && <InformesView />}
      {view === 'ofertas'   && (
        <OfertasPanel />
      )}
      {view === 'combos' && (
        <CombosPanel />
      )}
      {view === 'menus' && (
        <MenusDelDiaPanel />
      )}
      {view === 'carrusel' && (
        <CarruselPanel />
      )}
      {view === 'precios' && (
        <PreciosPanel />
      )}
      {view === 'reparto'    && <DeliveryView />}
      {view === 'pedidos'    && <PedidosView />}
      {view === 'fiados'     && <FiadosView />}
      {view === 'empleados'  && <EmpleadosView />}
      {view === 'gestoria'   && <GestoriaView />}
      {view === 'pairing'    && <PairingPanel />}
      {view === 'audit'      && <AuditView />}
      {view === 'turnos'    && <TurnosView />}
      {view === 'registro-horario' && <RegistroHorarioView />}
      {view === 'solicitudes'   && <SolicitudesView />}
      {view === 'pedidos-compra' && <PedidosCompraView />}
      {view === 'reservas'   && <ReservasView />}
      {view === 'waitlist'   && <WaitlistView />}
      {view === 'onlineorders' && <OnlineOrdersView />}
      {view === 'buffet'    && (
        <BuffetKioskView />
      )}
      {view === 'tickets'   && <TicketsView />}
      {view === 'pagos'     && <PaymentsView />}
      {view === 'accesos'   && <AccesosView />}
    </div>
  )
}

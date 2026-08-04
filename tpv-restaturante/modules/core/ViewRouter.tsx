import dynamic from 'next/dynamic'
import type { Theme } from '@/components/constants'
import type { Floor, Catalog, Sale, Employee, Offer, Combo, TicketSettings, CurrentUser, PriceRule, MealMenu, NewProductInput, RefundInput } from '@tpv/core'
import type { SalonViewProps } from '@/modules/salon/SalonView'
import type { CocinaViewProps } from '@/modules/kitchen/CocinaView'
import type { BarraViewProps } from '@/modules/kitchen/BarraView'
import type { KDSViewProps } from '@/modules/kitchen/KDSView'
import type { ComandasAbiertasViewProps } from '@/modules/kitchen/ComandasAbiertasView'
import type { Props as InventarioViewProps } from '@/modules/catalog/InventarioView'
import type { CartasViewProps } from '@/modules/catalog/CartasView'
import type { AlmacenMenuViewProps } from '@/modules/catalog/AlmacenMenuView'
import type { AlmacenDetalleViewProps } from '@/modules/catalog/AlmacenDetalleView'
import type { StockAlertasViewProps } from '@/modules/catalog/StockAlertasView'
import type { OfertasPanelProps } from '@/modules/catalog/OfertasPanel'
import type { CombosPanelProps } from '@/modules/catalog/CombosPanel'
import type { MenusDelDiaPanelProps } from '@/modules/catalog/MenusDelDiaPanel'
import type { CarruselPanelProps } from '@/modules/catalog/CarruselPanel'
import type { PreciosPanelProps } from '@/modules/catalog/PreciosPanel'
import type { ProduccionViewProps } from '@/modules/catalog/ProduccionView'
import type { DeliveryViewProps } from '@/modules/orders/DeliveryView'
import type { PedidosViewProps } from '@/modules/orders/PedidosView'
import type { FiadosViewProps } from '@/modules/orders/FiadosView'
import type { TicketsViewProps } from '@/modules/orders/TicketsView'
import type { EmpleadosViewProps } from '@/modules/employees/EmpleadosView'
import { useFloor, useCatalog, useAuth, useSales, useUi } from './app-contexts'

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
import SalonView from '@/modules/salon/SalonView'

interface ViewRouterProps {
  view: string
}

export default function ViewRouter({ view }: ViewRouterProps) {
  const floorCtx = useFloor()
  const catalogCtx = useCatalog()
  const authCtx = useAuth()
  const salesCtx = useSales()
  const ui = useUi()

  const { floor, showFloorEditor, setShowFloorEditor, persistFloor, markReady, updateItemState, advanceOrder, agotarProducto, reprintKitchenTicket, setSelectedTableId } = floorCtx
  const { catalog, offers, combos, setActiveCategory, almacenUbicacion, setAlmacenUbicacion, updateProductField, addProduct, deleteProduct, saveCartas, saveOffersFn, saveCombosFn, saveMealMenusFn, saveCarrusel, savePriceRulesFn, newProductOpen, setNewProductOpen, confirmDeleteId, setConfirmDeleteId } = catalogCtx
  const { currentUser, employees, addEmployee, updateEmployeeField, deleteEmployee } = authCtx
  const { sales, ticketSettings, handleRefund, handleConfirmBizum, printInvoice, handleDownloadPdf, handleSendInvoiceEmail } = salesCtx
  const { colors: C, setView, showToast } = ui

  return (
    <div className="fade-up" key={view}>
      {view === 'salon' && !showFloorEditor && (
        <SalonView
          floor={floor as unknown as SalonViewProps['floor']}
          onSelect={id => { setSelectedTableId(id); setActiveCategory('Todos') }}
          persistFloor={persistFloor as unknown as SalonViewProps['persistFloor']}
          colors={C}
          onEditFloor={() => setShowFloorEditor(true)}
        />
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
          <FloorEditor floor={floor as Floor} persistFloor={persistFloor} colors={C} />
        </div>
      )}
      {view === 'cocina'     && <CocinaView floor={floor as unknown as CocinaViewProps['floor']} catalog={catalog ?? undefined} onReady={markReady} colors={C} />}
      {view === 'barra'      && <BarraView floor={floor as unknown as BarraViewProps['floor']} catalog={catalog ?? undefined} onReady={markReady} colors={C} />}
      {view === 'kds'        && <KDSView floor={floor as unknown as KDSViewProps['floor']} catalog={catalog as unknown as KDSViewProps['catalog']} onReady={markReady} onUpdateItemState={updateItemState as unknown as KDSViewProps['onUpdateItemState']} onAdvanceOrder={advanceOrder as unknown as KDSViewProps['onAdvanceOrder']} onAgotar={agotarProducto} onReprint={reprintKitchenTicket} colors={C} />}
      {view === 'comandas'   && <ComandasAbiertasView floor={floor as unknown as ComandasAbiertasViewProps['floor']} colors={C} />}
      {view === 'inventario' && <InventarioView catalog={catalog as unknown as InventarioViewProps['catalog']} colors={C as unknown as Record<string, string>} onUpdateField={updateProductField as unknown as InventarioViewProps['onUpdateField']} newProductOpen={newProductOpen} setNewProductOpen={setNewProductOpen} onAddProduct={addProduct as unknown as InventarioViewProps['onAddProduct']} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />}
      {view === 'alertas-stock' && <StockAlertasView catalog={catalog as unknown as StockAlertasViewProps['catalog']} colors={C} />}
      {view === 'carta' && (
        <CartasView catalog={catalog as unknown as CartasViewProps['catalog']} onSave={saveCartas as unknown as CartasViewProps['onSave']} colors={C} />
      )}
      {view === 'almacen'    && (almacenUbicacion
        ? <AlmacenDetalleView catalog={catalog as unknown as AlmacenDetalleViewProps['catalog']} ubicacion={almacenUbicacion} onBack={() => setAlmacenUbicacion(null)} colors={C} onUpdateField={updateProductField} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />
        : <AlmacenMenuView catalog={catalog as unknown as AlmacenMenuViewProps['catalog']} onSelectUbicacion={setAlmacenUbicacion} onSelectAlbaranes={() => setView('albaranes')} colors={C} />
      )}
      {view === 'albaranes'  && <AlbaranesView colors={C} />}
      {view === 'produccion' && <ProduccionView catalog={catalog as unknown as ProduccionViewProps['catalog']} colors={C} />}
      {view === 'dashboard'  && <VentasDashboardView sales={sales} colors={C} />}      {view === 'informes'   && <InformesView sales={sales} colors={C} />}
      {view === 'ofertas'   && (
        <OfertasPanel offers={offers as unknown as OfertasPanelProps['offers']} catalog={catalog as unknown as OfertasPanelProps['catalog']} onSave={saveOffersFn} colors={C} />
      )}
      {view === 'combos' && (
        <CombosPanel combos={combos as unknown as CombosPanelProps['combos']} catalog={catalog as unknown as CombosPanelProps['catalog']} onSave={saveCombosFn as unknown as CombosPanelProps['onSave']} colors={C} />
      )}
      {view === 'menus' && (
        <MenusDelDiaPanel mealMenus={(catalog?.mealMenus || []) as unknown as MenusDelDiaPanelProps['mealMenus']} catalog={catalog as unknown as MenusDelDiaPanelProps['catalog']} onSave={saveMealMenusFn as unknown as MenusDelDiaPanelProps['onSave']} colors={C} />
      )}
      {view === 'carrusel' && (
        <CarruselPanel catalog={catalog as unknown as CarruselPanelProps['catalog']} onSave={saveCarrusel as unknown as CarruselPanelProps['onSave']} colors={C} />
      )}
      {view === 'precios' && (
        <PreciosPanel catalog={catalog as unknown as PreciosPanelProps['catalog']} priceRules={(catalog?.priceRules || []) as unknown as PreciosPanelProps['priceRules']} onSaveRules={savePriceRulesFn as unknown as PreciosPanelProps['onSaveRules']} colors={C} />
      )}
      {view === 'reparto'    && <DeliveryView catalog={catalog as unknown as DeliveryViewProps['catalog']} />}
      {view === 'pedidos'    && <PedidosView sales={sales as unknown as PedidosViewProps['sales']} onRefund={handleRefund as unknown as PedidosViewProps['onRefund']} onConfirmBizum={handleConfirmBizum} onPrintInvoice={printInvoice as unknown as PedidosViewProps['onPrintInvoice']} onDownloadPdf={handleDownloadPdf as unknown as PedidosViewProps['onDownloadPdf']} onSendInvoiceEmail={handleSendInvoiceEmail as unknown as PedidosViewProps['onSendInvoiceEmail']} colors={C} />}
      {view === 'fiados'     && <FiadosView sales={sales as unknown as FiadosViewProps['sales']} floor={floor as unknown as FiadosViewProps['floor']} onNavigateToTable={(tableId) => { setSelectedTableId(tableId); setView('salon') }} colors={C} />}
      {view === 'empleados'  && <EmpleadosView employees={employees as unknown as EmpleadosViewProps['employees']} colors={C} onAdd={addEmployee as unknown as EmpleadosViewProps['onAdd']} onUpdateField={updateEmployeeField as unknown as EmpleadosViewProps['onUpdateField']} onDelete={deleteEmployee} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} />}
      {view === 'gestoria'   && <GestoriaView sales={sales} colors={C} />}
      {view === 'pairing'    && <PairingPanel colors={C} />}
      {view === 'audit'      && <AuditView colors={C} />}
      {view === 'turnos'    && <TurnosView employees={employees} colors={C} />}
      {view === 'registro-horario' && <RegistroHorarioView employees={employees} colors={C} />}
      {view === 'solicitudes'   && <SolicitudesView colors={C} />}
      {view === 'pedidos-compra' && <PedidosCompraView colors={C} />}
      {view === 'reservas'   && <ReservasView floor={floor as Floor} catalog={catalog} colors={C} />}
      {view === 'waitlist'   && <WaitlistView colors={C} />}
      {view === 'onlineorders' && <OnlineOrdersView colors={C} />}
      {view === 'buffet'    && (
        <BuffetKioskView floor={floor} currentUser={currentUser} onToast={showToast} />
      )}
      {view === 'tickets'   && <TicketsView sales={sales as unknown as TicketsViewProps['sales']} colors={C} ticketSettings={ticketSettings} />}
      {view === 'pagos'     && <PaymentsView colors={C} />}
    </div>
  )
}

import dynamic from 'next/dynamic'
import { type Theme } from '@/components/constants'
import SalonView from '@/modules/salon/SalonView'

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

export interface ViewHandlers {
  setSelectedTableId: (id: string | null) => void
  setActiveCategory: (cat: string) => void
  setShowFloorEditor: (v: boolean) => void
  setAlmacenUbicacion: (v: any) => void
  setView: (v: any) => void
  markReady: (itemId: string) => void
  updateItemState: (...args: any[]) => void
  advanceOrder: (...args: any[]) => void
  agotarProducto: (...args: any[]) => void
  reprintKitchenTicket: (...args: any[]) => void
  updateProductField: (...args: any[]) => void
  addProduct: (...args: any[]) => void
  deleteProduct: (...args: any[]) => void
  saveCartas: (...args: any[]) => void
  saveOffersFn: (...args: any[]) => void
  saveCombosFn: (...args: any[]) => void
  saveMealMenusFn: (...args: any[]) => void
  saveCarrusel: (...args: any[]) => void
  savePriceRulesFn: (...args: any[]) => any
  handleRefund: (...args: any[]) => void
  handleConfirmBizum: (...args: any[]) => void
  printInvoice: (...args: any[]) => void
  handleDownloadPdf: (...args: any[]) => void
  handleSendInvoiceEmail: (...args: any[]) => void
  addEmployee: (...args: any[]) => void
  updateEmployeeField: (...args: any[]) => void
  deleteEmployee: (...args: any[]) => void
}

export interface ViewData {
  floor: any
  catalog: any
  sales: any[]
  employees: any[]
  offers: any[]
  combos: any[]
  colors: Theme
  ticketSettings: Record<string, any>
  currentUser: any
  showToast: (msg: string) => void
  almacenUbicacion: any
  showFloorEditor: boolean
  persistFloor: (next: any) => Promise<void>
  newProductOpen: boolean
  setNewProductOpen: (v: boolean) => void
  confirmDeleteId: string | null
  setConfirmDeleteId: (v: string | null) => void
}

interface ViewRouterProps {
  view: string
  handlers: ViewHandlers
  data: ViewData
}

export default function ViewRouter({ view, handlers, data }: ViewRouterProps) {
  const {
    floor, catalog, sales, employees, offers, combos, colors: C,
    ticketSettings, newProductOpen, setNewProductOpen,
    confirmDeleteId, setConfirmDeleteId, almacenUbicacion,
    showFloorEditor, currentUser, showToast, persistFloor,
  } = data

  const {
    setSelectedTableId, setActiveCategory, setShowFloorEditor,
    setAlmacenUbicacion, setView, markReady,
    updateItemState, advanceOrder, agotarProducto, reprintKitchenTicket,
    updateProductField, addProduct, deleteProduct,
    saveCartas, saveOffersFn, saveCombosFn, saveMealMenusFn,
    saveCarrusel, savePriceRulesFn,
    handleRefund, handleConfirmBizum,
    printInvoice, handleDownloadPdf, handleSendInvoiceEmail,
    addEmployee, updateEmployeeField, deleteEmployee,
  } = handlers

  return (
    <div className="fade-up" key={view}>
      {view === 'salon' && !showFloorEditor && (
        <SalonView
          floor={floor}
          onSelect={id => { setSelectedTableId(id); setActiveCategory('Todos') }}
          persistFloor={persistFloor}
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
          <FloorEditor floor={floor} persistFloor={persistFloor} colors={C} />
        </div>
      )}
      {view === 'cocina'     && <CocinaView floor={floor} catalog={catalog} onReady={markReady} colors={C} />}
      {view === 'barra'      && <BarraView floor={floor} catalog={catalog} onReady={markReady} colors={C} />}
      {view === 'kds'        && <KDSView floor={floor} catalog={catalog} onReady={markReady} onUpdateItemState={updateItemState} onAdvanceOrder={advanceOrder} onAgotar={agotarProducto} onReprint={reprintKitchenTicket} colors={C} />}
      {view === 'comandas'   && <ComandasAbiertasView floor={floor} colors={C} />}
      {view === 'inventario' && <InventarioView catalog={catalog} colors={C as unknown as Record<string, string>} onUpdateField={updateProductField} newProductOpen={newProductOpen} setNewProductOpen={setNewProductOpen} onAddProduct={addProduct} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />}
      {view === 'alertas-stock' && <StockAlertasView catalog={catalog} colors={C} />}
      {view === 'carta' && (
        <CartasView catalog={catalog} onSave={saveCartas} colors={C} />
      )}
      {view === 'almacen'    && (almacenUbicacion
        ? <AlmacenDetalleView catalog={catalog} ubicacion={almacenUbicacion} onBack={() => setAlmacenUbicacion(null)} colors={C} onUpdateField={updateProductField} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />
        : <AlmacenMenuView catalog={catalog} onSelectUbicacion={setAlmacenUbicacion} onSelectAlbaranes={() => setView('albaranes')} colors={C} />
      )}
      {view === 'albaranes'  && <AlbaranesView colors={C} />}
      {view === 'produccion' && <ProduccionView catalog={catalog} colors={C} />}
      {view === 'dashboard'  && <VentasDashboardView sales={sales} colors={C} />}
      {view === 'informes'   && <InformesView sales={sales} colors={C} />}
      {view === 'ofertas'   && (
        <OfertasPanel offers={offers} catalog={catalog} onSave={saveOffersFn} colors={C} />
      )}
      {view === 'combos' && (
        <CombosPanel combos={combos} catalog={catalog} onSave={saveCombosFn} colors={C} />
      )}
      {view === 'menus' && (
        <MenusDelDiaPanel mealMenus={catalog?.mealMenus || []} catalog={catalog} onSave={saveMealMenusFn} colors={C} />
      )}
      {view === 'carrusel' && (
        <CarruselPanel catalog={catalog} onSave={saveCarrusel} colors={C} />
      )}
      {view === 'precios' && (
        <PreciosPanel catalog={catalog} priceRules={catalog?.priceRules || []} onSaveRules={savePriceRulesFn} colors={C} />
      )}
      {view === 'reparto'    && <DeliveryView catalog={catalog} />}
      {view === 'pedidos'    && <PedidosView sales={sales} onRefund={handleRefund} onConfirmBizum={handleConfirmBizum} onPrintInvoice={printInvoice} onDownloadPdf={handleDownloadPdf} onSendInvoiceEmail={handleSendInvoiceEmail} colors={C} />}
      {view === 'fiados'     && <FiadosView sales={sales} floor={floor} onNavigateToTable={(tableId) => { setSelectedTableId(tableId); setView('salon') }} colors={C} />}
      {view === 'empleados'  && <EmpleadosView employees={employees} colors={C} onAdd={addEmployee} onUpdateField={updateEmployeeField} onDelete={deleteEmployee} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} />}
      {view === 'gestoria'   && <GestoriaView sales={sales} colors={C} />}
      {view === 'pairing'    && <PairingPanel colors={C} />}
      {view === 'audit'      && <AuditView colors={C} />}
      {view === 'turnos'    && <TurnosView employees={employees} colors={C} />}
      {view === 'registro-horario' && <RegistroHorarioView employees={employees} colors={C} />}
      {view === 'solicitudes'   && <SolicitudesView colors={C} />}
      {view === 'pedidos-compra' && <PedidosCompraView colors={C} />}
      {view === 'reservas'   && <ReservasView floor={floor} catalog={catalog} colors={C} />}
      {view === 'waitlist'   && <WaitlistView colors={C} />}
      {view === 'onlineorders' && <OnlineOrdersView colors={C} />}
      {view === 'buffet'    && (
        <BuffetKioskView floor={floor} currentUser={currentUser} onToast={showToast} />
      )}
      {view === 'tickets'   && <TicketsView sales={sales} colors={C} ticketSettings={ticketSettings} />}
      {view === 'pagos'     && <PaymentsView colors={C} />}
    </div>
  )
}

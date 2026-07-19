import {
  LayoutGrid, ChefHat, Package, BarChart3,
  ClipboardList, Users, Percent, Euro, Star, Undo2, FileText,
  Monitor, Calendar, Clock, Ticket, CreditCard, Beer, Truck,
  AlertTriangle, TrendingUp,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: any
}

export interface NavGroup {
  label: string
  color: string
  adminOnly?: boolean
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Sala y Cocina', color: '#4a90d9',
    items: [
      { id: 'salon',      label: 'Salon',      icon: LayoutGrid },
      { id: 'pairing',    label: 'Emparejar',  icon: Monitor },
      { id: 'comandas',   label: 'Comandas',   icon: ClipboardList },
      { id: 'cocina',     label: 'Cocina',     icon: ChefHat },
      { id: 'kds',        label: 'Cocina KDS',  icon: ChefHat },
      { id: 'barra',      label: 'Barra',       icon: Beer },
      { id: 'tickets',    label: 'Tickets',    icon: Ticket },
    ],
  },
  {
    label: 'Operaciones', color: '#4a90d9',
    adminOnly: true,
    items: [
      { id: 'pedidos',    label: 'Pedidos',    icon: Undo2 },
      { id: 'fiados',     label: 'Fiados',     icon: Clock },
      { id: 'reservas',   label: 'Reservas',   icon: Calendar },
      { id: 'waitlist',   label: 'Lista Espera', icon: Users },
    ],
  },
  {
    label: 'Canales', color: '#4caf50',
    adminOnly: true,
    items: [
      { id: 'buffet',      label: 'Buffet Kiosk', icon: ClipboardList },
      { id: 'onlineorders', label: 'Pedidos Online', icon: Truck },
      { id: 'reparto',    label: 'Reparto',    icon: Truck },
    ],
  },
  {
    label: 'Gestión', color: '#e8a838',
    adminOnly: true,
    items: [
      { id: 'inventario',  label: 'Inventario',     icon: Package },
      { id: 'alertas-stock', label: 'Stock Bajo',   icon: AlertTriangle },
      { id: 'carta',       label: 'Carta',          icon: ClipboardList },
      { id: 'dashboard',   label: 'Dashboard',      icon: TrendingUp },
      { id: 'informes',    label: 'Informes',       icon: BarChart3 },
      { id: 'empleados',  label: 'Equipo',     icon: Users },
      { id: 'ofertas',    label: 'Ofertas',    icon: Percent },
      { id: 'combos',     label: 'Combos',     icon: Package },
      { id: 'menus',      label: 'Menús',      icon: ChefHat },
      { id: 'carrusel',   label: 'Carrusel',   icon: Star },
      { id: 'precios',    label: 'Precios',    icon: Euro },
    ],
  },
  {
    label: 'Administración', color: '#c0392b',
    adminOnly: true,
    items: [
      { id: 'gestoria',   label: 'Gestoria',   icon: FileText },
      { id: 'pagos',      label: 'Pagos',      icon: CreditCard },
      { id: 'audit',      label: 'Auditoria',  icon: ClipboardList },
      { id: 'turnos',     label: 'Turnos',     icon: Calendar },
      { id: 'registro-horario', label: 'Reg. Horario', icon: Clock },
      { id: 'solicitudes',  label: 'Solicitudes', icon: ClipboardList },
      { id: 'pedidos-compra', label: 'Pedidos Compra', icon: FileText },
      { id: 'produccion', label: 'Producción', icon: Package },
    ],
  },
]

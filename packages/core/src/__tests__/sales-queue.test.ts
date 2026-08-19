import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processSalesQueue, type SalesQueueDeps } from '../application/sales/sales-queue'
import type { Sale } from '../domain/types'

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 's_1', tableId: 't1', createdAt: 1, total: '10', items: [],
    closedBy: 'e1', paymentMethod: 'efectivo', ...overrides,
  } as unknown as Sale
}

function makeDeps(overrides: Partial<SalesQueueDeps> = {}): SalesQueueDeps {
  const deps: SalesQueueDeps = {
    addSale: vi.fn().mockResolvedValue({ ok: true }),
    setSales: vi.fn(),
    cacheSet: vi.fn(),
    showToast: vi.fn(),
    log: vi.fn(),
    wait: vi.fn().mockResolvedValue(undefined),
    persistSale: vi.fn(),
    ...overrides,
  }
  return deps
}

describe('processSalesQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envía ventas ok y descarta de la cola', async () => {
    const sale = makeSale()
    const queue = [sale]
    const deps = makeDeps({ addSale: vi.fn().mockResolvedValue({ ok: true }) })
    await processSalesQueue(queue, { current: false }, deps)
    expect(deps.addSale).toHaveBeenCalledWith(sale)
    expect(queue).toHaveLength(0)
    expect(deps.persistSale).not.toHaveBeenCalled()
  })

  it('NO descarta la venta tras dos fallos: la persiste para sync durable', async () => {
    const sale = makeSale()
    const queue = [sale]
    const deps = makeDeps({
      addSale: vi.fn().mockRejectedValue(new Error('offline')),
    })
    await processSalesQueue(queue, { current: false }, deps)
    expect(deps.persistSale).toHaveBeenCalledWith(sale)
    expect(queue).toHaveLength(0)
    expect(deps.showToast).toHaveBeenCalledWith(expect.stringContaining('sin conexión'))
  })

  it('persiste cuando el segundo intento devuelve ok:false (respuesta vacía)', async () => {
    const sale = makeSale()
    const queue = [sale]
    const deps = makeDeps({
      addSale: vi.fn().mockResolvedValue({ ok: false }),
    })
    await processSalesQueue(queue, { current: false }, deps)
    expect(deps.persistSale).toHaveBeenCalledWith(sale)
  })

  it('recupera ticketNumber y lo lleva de vuelta al estado', async () => {
    const sale = makeSale()
    const queue = [sale]
    const deps = makeDeps({
      addSale: vi.fn().mockResolvedValue({ ok: true, ticketNumber: 'T-42' }),
      setSales: vi.fn(),
    })
    await processSalesQueue(queue, { current: false }, deps)
    expect(deps.setSales).toHaveBeenCalled()
    const updater = vi.mocked(deps.setSales).mock.calls[0][0]
    const next = updater([sale])
    expect(next[0].ticketNumber).toBe('T-42')
  })

  it('no re-entra si ya está procesando', async () => {
    const sale = makeSale()
    const queue = [sale]
    const deps = makeDeps()
    await processSalesQueue(queue, { current: true }, deps)
    expect(deps.addSale).not.toHaveBeenCalled()
    expect(queue).toHaveLength(1)
  })

  it('colas vacías no hacen nada', async () => {
    const queue: Sale[] = []
    const deps = makeDeps()
    await processSalesQueue(queue, { current: false }, deps)
    expect(deps.addSale).not.toHaveBeenCalled()
  })
})
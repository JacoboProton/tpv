type Handler = (...args: any[]) => void

class EventBus {
  private listeners: Map<string, Set<Handler>> = new Map()

  on(event: string, handler: Handler): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler)
    return () => this.listeners.get(event)?.delete(handler)
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler)
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(h => {
      try { h(...args) } catch (e) { console.error(`[EventBus] error in handler for "${event}":`, e) }
    })
  }

  clear(event?: string): void {
    if (event) this.listeners.delete(event)
    else this.listeners.clear()
  }
}

export const eventBus = new EventBus()

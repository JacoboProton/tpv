import { useEffect } from 'react'
import { eventBus, type EventMap } from '../lib/event-bus'

export function useEvent<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void) {
  useEffect(() => {
    return eventBus.on(event, handler)
  }, [event, handler])
}

import { useEffect } from 'react'
import { eventBus } from '../lib/event-bus'

export function useEvent(event: string, handler: (...args: any[]) => void) {
  useEffect(() => {
    return eventBus.on(event, handler)
  }, [event, handler])
}

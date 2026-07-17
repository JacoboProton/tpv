'use client'

import { useState, useCallback } from 'react'
import { eventBus } from '@/lib/event-bus'
import { useEvent } from '@/hooks/useEvent'

const MAX_LOG = 20

export function EventLog() {
  const [events, setEvents] = useState<Array<{ event: string; data: any; time: string }>>([])
  const [visible, setVisible] = useState(false)

  const log = useCallback((event: string, data: any) => {
    setEvents(prev => [{ event, data, time: new Date().toLocaleTimeString() }, ...prev].slice(0, MAX_LOG))
  }, [])

  useEvent('order:created', (data) => log('order:created', data))
  useEvent('order:closed', (data) => log('order:closed', data))
  useEvent('item:sent', (data) => log('item:sent', data))
  useEvent('payment:completed', (data) => log('payment:completed', data))
  useEvent('payment:refunded', (data) => log('payment:refunded', data))
  useEvent('stock:changed', (data) => log('stock:changed', data))

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{ position: 'fixed', bottom: 8, right: 8, zIndex: 9999, background: '#1a1d23', color: '#9c958a', border: '1px solid #404550', borderRadius: 8, fontSize: 10, padding: '4px 8px', cursor: 'pointer', opacity: 0.4 }}
      >
        EVENTS
      </button>
    )
  }

  return (
    <div style={{ position: 'fixed', bottom: 8, right: 8, zIndex: 9999, background: '#1a1d23', border: '1px solid #404550', borderRadius: 8, padding: 8, width: 320, maxHeight: 240, overflowY: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#c4a04a', fontWeight: 600 }}>EventBus</span>
        <button onClick={() => setVisible(false)} style={{ color: '#9c958a', cursor: 'pointer', background: 'none', border: 'none', fontSize: 11 }}>✕</button>
      </div>
      {events.length === 0 && <div style={{ color: '#555' }}>No events yet</div>}
      {events.map((e, i) => (
        <div key={i} style={{ color: '#e6e1d6', padding: '2px 0', borderBottom: '1px solid #30343e' }}>
          <span style={{ color: '#7a9a7c' }}>{e.time}</span>{' '}
          <span style={{ color: '#4a90d9' }}>{e.event}</span>{' '}
          <span style={{ color: '#9c958a' }}>{JSON.stringify(e.data).slice(0, 80)}</span>
        </div>
      ))}
    </div>
  )
}

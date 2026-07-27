'use client'

export default function SentryExamplePage() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Sentry Test</h1>
      <button
        onClick={() => { throw new Error('Test error desde Sentry example page') }}
        style={{ padding: '12px 24px', fontSize: 16, cursor: 'pointer' }}>
        Lanzar error de prueba
      </button>
    </div>
  )
}

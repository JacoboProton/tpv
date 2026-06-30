'use client';

const C = {
  base: '#3d424f', surface: '#4d5363', surfaceLight: '#5f6578',
  brass: '#e0c06a', brassLight: '#f0d88a', cream: '#f5f0e8', muted: '#c0b8ac',
};

const APK_URL = 'https://expo.dev/artifacts/eas/24cV9vwW9lTDA8E9w3NdLGHCtFZNUnT2_w_bbtEeM2g.apk';

export default function DescargarPage() {
  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-display mb-2" style={{ color: C.brassLight }}>LA COMANDA</h1>
      <p style={{ color: C.muted }} className="text-sm mb-10">App Móvil para Camareros</p>

      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="w-48 h-48 rounded-2xl flex items-center justify-center" style={{ background: C.surface }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(APK_URL)}`}
            alt="QR para descargar la app"
            className="w-44 h-44"
          />
        </div>
        <p className="text-lg font-medium">Escanea con tu móvil</p>
        <p style={{ color: C.muted }} className="text-sm">
          o descarga directamente:
        </p>
        <a
          href={APK_URL}
          style={{ background: C.brass, color: C.base }}
          className="px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-all"
        >
          Descargar APK
        </a>
        <p style={{ color: C.muted }} className="text-xs mt-4">
          Versión 1.0.0 — Android
        </p>
      </div>
    </div>
  );
}

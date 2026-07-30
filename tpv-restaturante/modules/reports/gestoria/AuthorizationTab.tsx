'use client';

import { useState, useEffect } from 'react';
import { Shield, Download } from 'lucide-react';
import type { Theme } from '@/components/constants';
import type { Authorization } from './types';
import { generateAuthorizationPDF } from './utils';

export function AuthorizationTab({ authorization, onDataChange, C }: {
  authorization: Authorization | null;
  onDataChange: () => void;
  C: Theme;
}) {
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [socialRed, setSocialRed] = useState(false);

  useEffect(() => {
    if (authorization) {
      setName(authorization.accountant_name || '');
      setNif(authorization.accountant_nif || '');
      setSocialRed(authorization.social_security_red || false);
    }
  }, [authorization]);

  const isAuthorized = authorization?.signed_at && !authorization?.revoked;

  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-lg p-4" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
        <h3 className="text-sm font-medium mb-2" style={{ color: C.cream }}>Tu gestoría</h3>
        <p className="text-xs mb-4" style={{ color: C.muted }}>
          Autoriza a tu gestoría a presentar tus impuestos y gestionar la Seguridad Social.
          Una vez firmado, puedes descargar el mandato y revocarlo cuando quieras.
        </p>
        {isAuthorized ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: C.sage + '20', border: `1px solid ${C.sage}40` }}>
              <Shield className="w-5 h-5" style={{ color: C.sageLight }} />
              <div>
                <p className="text-sm font-medium" style={{ color: C.sageLight }}>Gestoría autorizada</p>
                <p className="text-xs" style={{ color: C.muted }}>
                  {authorization.accountant_name} ({authorization.accountant_nif}) · Desde {new Date(authorization.signed_at).toLocaleDateString('es-ES')}
                </p>
                {authorization.social_security_red && <p className="text-[10px]" style={{ color: C.sageLight }}>✓ Asignación RED de la Seguridad Social confirmada</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                const auth = await import('../../../lib/api').then(m => m.fetchGestoriaAuthorization()) as Authorization;
                const html = generateAuthorizationPDF(auth);
                const w = window.open('', '_blank');
                if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.brass + '30', color: C.brassLight }}>
                <Download className="w-3.5 h-3.5" /> Descargar mandato
              </button>
              <button onClick={async () => {
                if (!confirm('¿Revocar la autorización? Tu gestoría ya no podrá presentar impuestos en tu nombre.')) return;
                await import('../../../lib/api').then(m => m.saveGestoriaAuthorization({ revoke: true }));
                onDataChange();
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.wine + '30', color: C.wineLight }}>
                Revocar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Nombre de la gestoría</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>NIF de la gestoría</label>
                <input type="text" value={nif} onChange={e => setNif(e.target.value)}
                  style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs" style={{ color: C.cream }}>
              <input type="checkbox" checked={socialRed} onChange={e => setSocialRed(e.target.checked)} className="rounded" style={{ accentColor: C.brass }} />
              Confirmar asignación RED de la Seguridad Social
            </label>
            <p className="text-[10px]" style={{ color: C.muted }}>
              Al autorizar, firmas el mandato de colaboración social de Hacienda. Tu gestoría podrá presentar
              tus modelos tributarios y tramitar altas y bajas de trabajadores en tu nombre.
            </p>
            <button onClick={async () => {
              if (!name || !nif) return;
              if (!confirm('¿Confirmas la autorización? Tu gestoría podrá presentar tus impuestos.')) return;
              await import('../../../lib/api').then(m => m.saveGestoriaAuthorization({ name, nif, signedAt: Date.now(), socialRed }));
              onDataChange();
            }} className="w-full rounded-lg py-2 text-sm font-medium hover:opacity-80" style={{ background: C.sage, color: '#000' }}>
              <Shield className="w-4 h-4 inline mr-1.5" /> Autorizar gestoría
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

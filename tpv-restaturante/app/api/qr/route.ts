import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { apiError, apiTooManyRequests } from '../../../lib/infrastructure/response';
import { rateLimit, getClientIp } from '../../../lib/rate-limit';

// SIN requireRole — endpoint público que genera el código QR de una mesa
// para que los clientes escaneen y vean el menú. No requiere sesión.
// Solo devuelve una imagen SVG, ningún dato del negocio.
export async function GET(req: NextRequest) {
  const rl = await rateLimit(`qr:${getClientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return apiTooManyRequests();
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get('mesa') || '';
    const origin = req.headers.get('origin') || req.headers.get('host') || 'localhost:3000';
    const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`;
    const url = `${baseUrl}/menu?mesa=${encodeURIComponent(tableId)}`;
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 300, color: { dark: '#efeae0', light: '#0f0d0a' } });
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (err) { return apiError(err); }
}

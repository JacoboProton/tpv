import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(req: NextRequest) {
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
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

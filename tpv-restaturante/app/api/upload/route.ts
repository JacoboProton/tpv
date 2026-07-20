import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });

    const name = (file as File).name || 'image.png';
    const ext = (name.split('.').pop() ?? '').toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return NextResponse.json({ error: 'Formato no permitido (jpg, png, webp, gif, svg)' }, { status: 400 });
    }

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const maxSize = 2 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json({ error: 'La imagen no puede superar 2MB' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err: any) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

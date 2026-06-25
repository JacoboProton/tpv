import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });

    const name = file.name || 'image.png';
    const ext = name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return NextResponse.json({ error: 'Formato no permitido (jpg, png, webp, gif, svg)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const maxSize = 2 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json({ error: 'La imagen no puede superar 2MB' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

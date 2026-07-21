import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return apiBadRequest('No se envió ningún archivo');

    const name = (file as File).name || 'image.png';
    const ext = (name.split('.').pop() ?? '').toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return apiBadRequest('Formato no permitido (jpg, png, webp, gif, svg)');
    }

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const maxSize = 2 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return apiBadRequest('La imagen no puede superar 2MB');
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    return apiOk({ url: `/uploads/${filename}` });
  } catch (err) { return apiError(err); }
}

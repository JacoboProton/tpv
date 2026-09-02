import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';

const IMAGE_SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  jpg: (b) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: (b) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.length > 8 && b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a,
  webp: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  gif: (b) => b.length > 5 && (b.toString('ascii', 0, 4) === 'GIF8' && (b[4] === 0x37 || b[4] === 0x39) && b.toString('ascii', 5, 6) === 'a'),
};

function isImageSignature(buffer: Buffer, ext: string): boolean {
  const check = IMAGE_SIGNATURES[ext];
  if (!check) return false;
  return check(buffer);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return apiBadRequest('No se envió ningún archivo');

    const name = (file as File).name || 'image.png';
    const ext = (name.split('.').pop() ?? '').toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      return apiBadRequest('Formato no permitido (jpg, jpeg, png, webp, gif)');
    }

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const maxSize = 2 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return apiBadRequest('La imagen no puede superar 2MB');
    }

    const signatureOk = isImageSignature(buffer, ext);
    if (!signatureOk) {
      return apiBadRequest('El contenido no coincide con el formato declarado');
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    return apiOk({ url: `/uploads/${filename}` });
  } catch (err) { return apiError(err); }
}

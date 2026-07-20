import { NextRequest } from 'next/server';
import { z } from 'zod';

export async function parseBody<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const body = await req.json();
    return schema.parseAsync(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(JSON.stringify(err.issues));
    }
    if (err instanceof SyntaxError) {
      throw new Error('Invalid JSON body');
    }
    throw err;
  }
}

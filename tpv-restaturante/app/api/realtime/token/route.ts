import { NextRequest } from 'next/server';
import { getSessionEmployee } from '../../../../lib/rbac';
import { getPublicTenantId } from '../../../../lib/tenant';
import { apiOk, apiError, apiForbidden } from '../../../../lib/infrastructure/response';
import { SignJWT } from 'jose';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getPublicTenantId(req);
    if (!tenantId) return apiForbidden('Tenant no autorizado');
    const emp = await getSessionEmployee(req);
    
    const employeeId = emp?.id || 'anonymous';
    const role = emp?.role || 'authenticated';
    
    const secretStr = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
    if (!secretStr) {
      throw new Error('Falta variable de entorno: SUPABASE_JWT_SECRET o JWT_SECRET');
    }
    const secret = new TextEncoder().encode(secretStr);
    
    const jwt = await new SignJWT({
      aud: 'authenticated',
      role: 'authenticated',
      sub: employeeId,
      tenant_id: tenantId,
      app_metadata: {
        tenant_id: tenantId,
      },
      user_metadata: {
        tenant_id: tenantId,
        role: role,
      },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret);
      
    return apiOk({ token: jwt });
  } catch (err) {
    return apiError(err);
  }
}

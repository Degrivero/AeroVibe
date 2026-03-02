import { supabaseAdmin } from '../lib/supabase.js';
import { env } from '../lib/env.js';
import { HttpError } from '../lib/httpError.js';
import { asyncHandler } from '../lib/asyncHandler.js';

function parseGatewayUser(req) {
  const userId = String(req.headers['x-user-id'] ?? '').trim();
  if (!userId) return null;
  return {
    id: userId,
    email: String(req.headers['x-user-email'] ?? '').trim() || null,
    role: String(req.headers['x-user-role'] ?? 'user').trim().toLowerCase() || 'user',
  };
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const forwarded = parseGatewayUser(req);
  if (forwarded) {
    req.user = forwarded;
    return next();
  }

  if (!env.ALLOW_DIRECT_JWT) {
    throw new HttpError(401, 'GATEWAY_AUTH_REQUIRED', 'Falta identidad validada por API Gateway.');
  }

  const auth = String(req.headers.authorization ?? '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    throw new HttpError(401, 'TOKEN_MISSING', 'Falta token Bearer.');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new HttpError(401, 'TOKEN_INVALID', 'Token inválido o sesión no válida.');
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? null,
    role: String(data.user.app_metadata?.role ?? 'user').toLowerCase(),
  };
  return next();
});

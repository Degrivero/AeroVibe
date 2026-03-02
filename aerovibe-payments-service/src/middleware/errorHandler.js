import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Endpoint no encontrado.'));
}

export function errorHandler(err, _req, res, _next) {
  const status = Number(err?.status || 500);
  const code = err?.code || 'INTERNAL_SERVER_ERROR';
  const message = err?.message || 'Error interno del servidor.';
  const details = err?.details ?? null;

  if (status >= 500) {
    logger.error('unhandled error', {
      code,
      message,
      stack: err?.stack,
    });
  } else {
    logger.warn('request error', { code, message, details });
  }

  return res.status(status).json({
    code,
    message,
    ...(details ? { details } : {}),
  });
}

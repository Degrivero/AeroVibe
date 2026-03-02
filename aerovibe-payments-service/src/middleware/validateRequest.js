import { HttpError } from '../lib/httpError.js';

export function validateBody(schema) {
  return function bodyValidator(req, _res, next) {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.flatten();
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Payload inválido.', details));
    }
    req.validatedBody = parsed.data;
    return next();
  };
}

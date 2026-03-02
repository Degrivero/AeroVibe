import { asyncHandler } from '../lib/asyncHandler.js';
import { markWebhookEventAsReceived } from '../services/subscriptionService.js';

export const webhookEventIdempotencyGuard = asyncHandler(async (req, res, next) => {
  const provider = String(req.webhookProvider ?? 'unknown').trim().toLowerCase();
  const eventId = String(req.webhookEventId ?? '').trim();
  const eventType = String(req.webhookEventType ?? 'unknown').trim();

  if (!eventId) return next();

  const firstTime = await markWebhookEventAsReceived(eventId, eventType, provider);
  if (!firstTime) {
    return res.status(200).json({ ok: true, duplicate: true, eventId, provider });
  }

  return next();
});

export const stripeEventIdempotencyGuard = webhookEventIdempotencyGuard;

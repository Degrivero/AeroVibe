import express, { Router } from 'express';

import {
  postMercadoPagoWebhook,
  postStripeWebhook,
  verifyMercadoPagoWebhook,
  verifyStripeWebhook,
} from '../controllers/paymentsController.js';
import { webhookEventIdempotencyGuard } from '../middleware/idempotencyGuard.js';

const router = Router();

// Legacy path kept for Stripe compatibility.
router.post('/', express.raw({ type: 'application/json' }), verifyStripeWebhook, webhookEventIdempotencyGuard, postStripeWebhook);
router.post('/stripe', express.raw({ type: 'application/json' }), verifyStripeWebhook, webhookEventIdempotencyGuard, postStripeWebhook);

router.post(
  '/mercadopago_cl',
  express.json({ limit: '1mb' }),
  verifyMercadoPagoWebhook,
  webhookEventIdempotencyGuard,
  postMercadoPagoWebhook,
);

router.post(
  '/mercadopago_ar',
  express.json({ limit: '1mb' }),
  verifyMercadoPagoWebhook,
  webhookEventIdempotencyGuard,
  postMercadoPagoWebhook,
);

export { router as webhookRouter };

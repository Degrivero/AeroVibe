import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateRequest.js';
import {
  getAdminPricing,
  getStatus,
  postAdminPricingUpdate,
  postCheckout,
  postPortal,
} from '../controllers/paymentsController.js';

const checkoutSchema = z
  .object({
    plan: z.enum(['monthly', 'annual']).optional(),
    priceId: z.string().min(1).optional(),
  })
  .refine((value) => value.plan || value.priceId, {
    message: 'Debes enviar plan o priceId.',
    path: ['plan'],
  });

const pricingUpdateSchema = z.object({
  clRate: z.coerce.number().positive(),
  arRate: z.coerce.number().positive(),
});

const router = Router();

router.post('/payments/subscription/checkout', requireAuth, validateBody(checkoutSchema), postCheckout);
router.post('/payments/subscription/portal', requireAuth, postPortal);
router.get('/payments/subscription/status', requireAuth, getStatus);

router.get('/payments/admin/pricing', requireAuth, getAdminPricing);
router.post('/payments/admin/pricing/update', requireAuth, validateBody(pricingUpdateSchema), postAdminPricingUpdate);

export { router as paymentsRouter };

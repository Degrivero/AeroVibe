import Stripe from 'stripe';
import { env } from './env.js';

export const stripe = env.ENABLE_STRIPE
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : null;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { paymentsRouter } from './routes/paymentsRoutes.js';
import { webhookRouter } from './routes/webhookRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

const corsOrigins = env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : ['*'];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);

if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'payments', ts: new Date().toISOString() });
});

app.use('/payments/webhook', webhookRouter);

app.use(express.json({ limit: '1mb' }));
app.use(paymentsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, env.BIND_HOST, () => {
  logger.info('payments service listening', {
    host: env.BIND_HOST,
    port: env.PORT,
    env: env.NODE_ENV,
  });
});

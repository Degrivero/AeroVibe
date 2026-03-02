import { connect, JSONCodec } from 'nats';
import { env } from './env.js';
import { logger } from './logger.js';

let nc;
const jc = JSONCodec();

async function getConnection() {
  if (nc) return nc;
  nc = await connect({ servers: env.NATS_URL });
  logger.info('[NATS] connected', { servers: env.NATS_URL });
  return nc;
}

export async function publishEvent(subject, payload) {
  try {
    const conn = await getConnection();
    conn.publish(subject, jc.encode(payload));
  } catch (error) {
    logger.error('[NATS] publish failed', {
      subject,
      error: error?.message,
    });
  }
}

export async function drainNats() {
  if (!nc) return;
  await nc.drain();
  nc = null;
}

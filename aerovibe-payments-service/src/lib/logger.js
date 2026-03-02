const SERVICE_NAME = process.env.SERVICE_NAME || 'payments-service';
const LOG_LEVEL = String(process.env.LOG_LEVEL || 'info').trim().toLowerCase();

const LEVEL_PRIORITY = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function format(message, meta) {
  const base = typeof message === 'string' ? message : safeStringify(message);
  if (!meta) return base;
  return `${base} ${safeStringify(meta)}`;
}

function shouldLog(level) {
  const current = LEVEL_PRIORITY[LOG_LEVEL] ?? LEVEL_PRIORITY.info;
  const wanted = LEVEL_PRIORITY[level] ?? LEVEL_PRIORITY.info;
  return wanted >= current;
}

function write(level, message, meta) {
  if (!shouldLog(level)) return;

  const ts = new Date().toISOString();
  const line = `[${ts}] [${SERVICE_NAME}] [${level.toUpperCase()}] ${format(message, meta)}\n`;

  if (level === 'warn' || level === 'error') {
    process.stderr.write(line);
    return;
  }

  process.stdout.write(line);
}

export const logger = Object.freeze({
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
});

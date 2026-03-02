#!/usr/bin/env node
/**
 * Desbloquear admin: delega al script de aerovibe-api-service (ahí están las dependencias).
 * Uso desde la raíz del repo:
 *   EMAIL=degrivero@gmail.com node scripts/unblock-admin.js
 * O desde api-service:
 *   cd aerovibe-api-service && EMAIL=degrivero@gmail.com node scripts/unblock-admin.js
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const apiServiceScript = path.join(root, 'aerovibe-api-service', 'scripts', 'unblock-admin.js');

const child = spawn(
  process.execPath,
  [apiServiceScript],
  {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: path.join(root, 'aerovibe-api-service'),
  }
);

child.on('exit', (code) => process.exit(code ?? 0));

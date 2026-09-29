// Production entry point (PM2 runs this file on Ploi).
// Astro's standalone server never reads .env itself, so load it first. Variables that are
// already set in the environment (CI, tests) win over the file.
import { existsSync } from 'node:fs';

const envFile = new URL('./.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

process.env.HOST ??= '127.0.0.1';

await import('./dist/server/entry.mjs');

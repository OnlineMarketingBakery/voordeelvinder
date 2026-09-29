import { existsSync } from 'node:fs';

import { parseServerEnv, type ServerEnv } from '../../src/server/env';

/** Loads the site's .env the same way server.mjs does, then validates it. */
export function loadScriptEnv(): ServerEnv {
  const envFile = new URL('../../.env', import.meta.url);
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  return parseServerEnv(process.env);
}

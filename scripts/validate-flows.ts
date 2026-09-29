// Validates every form flow in src/content/flows (brief §7.1): reachability, dead ends,
// loops, goto targets, var references, unique option codes, locale parity, shared contact step.
// The flow engine and flows arrive in Phase 4; until then this only checks that no flow
// files exist that would go unvalidated.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FLOWS_DIR = join(import.meta.dirname, '..', 'src', 'content', 'flows');

function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(entry.parentPath, entry.name));
}

const files = listJson(FLOWS_DIR);

if (files.length > 0) {
  console.error(
    `validate:flows found ${files.length} flow file(s) but the validator is not implemented yet (Phase 4).`,
  );
  process.exit(1);
}

console.log('validate:flows: no flows yet (Phase 4).');

// Reads the flow files for validate:flows: one folder per locale (nl/, later fr/), each with
// an optional _shared.json and one <flow>.json per product.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FlowIssue, LocaleSources } from '../../src/lib/flow/validate';

export const SHARED_FILE = '_shared.json';

function readJson(root: string, path: string, issues: FlowIssue[]): unknown {
  try {
    return JSON.parse(readFileSync(join(root, path), 'utf8'));
  } catch (error) {
    issues.push({ file: path, message: `not valid JSON: ${(error as Error).message}` });
    return undefined;
  }
}

export function loadFlowSources(root: string): { locales: LocaleSources[]; issues: FlowIssue[] } {
  const locales: LocaleSources[] = [];
  const issues: FlowIssue[] = [];
  if (!existsSync(root)) return { locales, issues };

  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) {
      if (entry.name.endsWith('.json')) {
        issues.push({
          file: entry.name,
          message: 'flow files belong in a locale folder such as nl/',
        });
      }
      continue;
    }
    const locale = entry.name;
    if (!/^[a-z]{2}$/.test(locale)) {
      issues.push({
        file: `${locale}/`,
        message: 'a locale folder is a two-letter code such as nl',
      });
      continue;
    }
    const sources: LocaleSources = { locale, flows: [] };
    const names = readdirSync(join(root, locale)).filter((name) => name.endsWith('.json'));
    for (const name of names.sort()) {
      const path = `${locale}/${name}`;
      const data = readJson(root, path, issues);
      if (data === undefined) continue;
      if (name === SHARED_FILE) sources.shared = { path, data };
      else sources.flows.push({ path, data });
    }
    locales.push(sources);
  }
  return { locales, issues };
}

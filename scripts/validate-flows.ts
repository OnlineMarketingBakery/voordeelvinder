// Validates every form flow in src/content/flows (brief §7.1): schema, goto targets, dead ends,
// loops, unreachable steps, known vars read after they're asked, option codes (unique, and
// identical across locales together with payload targets, required flags and branching), a flow
// for every product an option continues in, that every flow ends with the shared contact step,
// which can't be skipped, the config switches (gas) and the form's copy file (_copy.json). The
// checks live in src/lib/flow/validate.ts. Runs before every build (prebuild) and in CI.
//
//   npm run validate:flows              the site's flows
//   tsx scripts/validate-flows.ts DIR   another flows folder (the tests' fixtures)
import { join, resolve } from 'node:path';

import { validateFlowSources } from '../src/lib/flow/validate';
import { loadFlowSources } from './lib/flow-sources';

const root = resolve(process.argv[2] ?? join(import.meta.dirname, '..', 'src', 'content', 'flows'));
const { locales, issues: readIssues } = loadFlowSources(root);
const issues = [...readIssues, ...validateFlowSources(locales)];
const flowCount = locales.reduce((count, locale) => count + locale.flows.length, 0);

if (issues.length > 0) {
  console.error(`validate:flows: ${issues.length} problem(s) in ${root}`);
  for (const { file, message } of issues) console.error(`  ${file}: ${message}`);
  process.exit(1);
}

console.log(
  flowCount === 0
    ? 'validate:flows: no flow files yet.'
    : `validate:flows: ${flowCount} flow(s) in ${locales.length} locale(s) are valid.`,
);

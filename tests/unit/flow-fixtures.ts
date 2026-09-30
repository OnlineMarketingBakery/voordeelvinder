// Loads the fixture flows in tests/fixtures/flows for the flow engine and validator tests.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveFlow } from '../../src/lib/flow/resolve';
import { flowFile, sharedStepsFile, type Flow, type Step } from '../../src/lib/flow/schema';

export const FIXTURES = join(import.meta.dirname, '..', 'fixtures', 'flows');

export function readFixture(path: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES, path), 'utf8'));
}

/** A resolved flow from a fixture folder, e.g. fixtureFlow('valid', 'energie'). */
export function fixtureFlow(set: string, name: string, locale = 'nl'): Flow {
  const shared = sharedStepsFile.parse(readFixture(`${set}/${locale}/_shared.json`));
  return resolveFlow(flowFile.parse(readFixture(`${set}/${locale}/${name}.json`)), shared);
}

/** A yes/no question step, for small hand-made flows. */
export function question(id: string, next: Step['next'], extra: Partial<Step> = {}): Step {
  return {
    id,
    title: `Vraag ${id}`,
    fields: [{ id, type: 'yes_no', required: true }],
    next,
    ...extra,
  };
}

export function smallFlow(steps: Step[], firstStep = steps[0]!.id): Flow {
  return { id: 'test', version: 1, product: 'energie', firstStep, steps };
}

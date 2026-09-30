// The server's copy of the flows (src/server/lead/flows.ts) must be exactly what the form pages
// resolve through the flow schema (src/lib/form-content.ts), without importing that schema.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveFlow } from '../../src/lib/flow/resolve';
import { flowCopyFile, flowFile, sharedStepsFile } from '../../src/lib/flow/schema';
import { PRODUCTS } from '../../src/lib/flow/types';
import {
  normaliseFlowFile,
  normaliseSharedFile,
  serverFlowCopy,
  serverFlows,
} from '../../src/server/lead/flows';

const SERVER = join(import.meta.dirname, '..', '..', 'src', 'server');
const FLOWS = join(import.meta.dirname, '..', '..', 'src', 'content', 'flows', 'nl');
const read = (name: string): unknown => JSON.parse(readFileSync(join(FLOWS, name), 'utf8'));

describe('server flows', () => {
  it('equal the schema-parsed, resolved flows for every product', () => {
    const shared = sharedStepsFile.parse(read('_shared.json'));
    for (const product of PRODUCTS) {
      const expected = resolveFlow(flowFile.parse(read(`${product}.json`)), shared);
      expect(serverFlows()[product], product).toEqual(expected);
    }
  });

  it('apply the switches as set (no gas cards while gas is off)', () => {
    const field = serverFlows().energie.steps.find((step) => step.id === 'product')!.fields[0]!;
    const codes = field.type === 'single_choice' ? field.options.map((option) => option.code) : [];
    const gasOn = (read('_shared.json') as { switches: { gas: boolean } }).switches.gas;
    expect(codes.includes('gas')).toBe(gasOn);
  });

  it('are cached', () => {
    expect(serverFlows()).toBe(serverFlows());
  });

  it('give the contact step (no next in the JSON) an empty next', () => {
    expect(serverFlows().energie.steps.find((step) => step.id === 'contact')!.next).toEqual([]);
    const step = { id: 'a', title: 'A', fields: [{ id: 'a', type: 'yes_no' as const }] };
    expect(normaliseSharedFile({ steps: [step] }).steps[0]!.next).toEqual([]);
    const file = normaliseFlowFile({
      id: 'x',
      version: 1,
      product: 'energie',
      firstStep: 'a',
      steps: [{ use: 'a' }, { ...step, next: [{ goto: 'a' }] }],
    });
    expect(file.steps).toEqual([{ use: 'a' }, { ...step, next: [{ goto: 'a' }] }]);
  });

  it('serve the form copy, valid against its schema', () => {
    expect(flowCopyFile.parse(serverFlowCopy())).toEqual(serverFlowCopy());
    expect(serverFlowCopy().yesNo).toEqual({ yes: 'Ja', no: 'Nee' });
  });

  it('never import the flow schema (it reads src/assets from disk, which fails in dist/server)', () => {
    for (const file of ['lead/flows.ts', 'lead/validate.ts', 'lead/payload.ts']) {
      const source = readFileSync(join(SERVER, file), 'utf8');
      const valueImports = source.match(/^import (?!type )[^;]*from '[^']*';$/gms) ?? [];
      for (const statement of valueImports) {
        expect(statement, file).not.toMatch(/flow\/schema'|asset-keys'|flow\/validate'/);
      }
    }
  });
});

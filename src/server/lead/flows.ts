// The server's own copy of the form flows (brief §9.1 step 2, docs/PAYLOAD.md): the lead
// endpoint re-validates every submission against these, never against anything the browser
// sends. The same files and the same resolveFlow as the form pages (src/lib/form-content.ts),
// so the switches (gas) apply identically.
//
// The JSON is imported directly instead of through the content layer or the flow schema:
// src/lib/flow/schema.ts reads src/assets from disk when it loads (asset-keys.ts), which fails
// inside dist/server. The files are validated before this code ever runs: by the content
// collections (same schema) and by validate:flows, which runs before every build. The only
// thing the schema adds is the default `next: []` (the contact step has none), filled in below.
// tests/unit/lead-flows.test.ts proves the result equals the schema-parsed flows.
import copyJson from '../../content/flows/nl/_copy.json' with { type: 'json' };
import sharedJson from '../../content/flows/nl/_shared.json' with { type: 'json' };
import energieJson from '../../content/flows/nl/energie.json' with { type: 'json' };
import thuisbatterijJson from '../../content/flows/nl/thuisbatterij.json' with { type: 'json' };
import zonnepanelenJson from '../../content/flows/nl/zonnepanelen.json' with { type: 'json' };
import { resolveFlow } from '../../lib/flow/resolve';
import type {
  Flow,
  FlowCopy,
  FlowFile,
  SharedStepsFile,
  Step,
  StepRef,
} from '../../lib/flow/schema';
import { PRODUCTS, type Product } from '../../lib/flow/types';

/** A step as written in the JSON: `next` may be left out (the schema defaults it to []). */
type RawStep = Omit<Step, 'next'> & { next?: Step['next'] };
type RawFlowFile = Omit<FlowFile, 'steps'> & { steps: (RawStep | StepRef)[] };
type RawSharedFile = Omit<SharedStepsFile, 'steps'> & { steps: RawStep[] };

function withNext(step: RawStep): Step {
  return { ...step, next: step.next ?? [] };
}

/** A flow file with the schema's defaults filled in. */
export function normaliseFlowFile(raw: RawFlowFile): FlowFile {
  return {
    ...raw,
    steps: raw.steps.map((entry) => ('use' in entry ? entry : withNext(entry))),
  };
}

/** A shared steps file with the schema's defaults filled in. */
export function normaliseSharedFile(raw: RawSharedFile): SharedStepsFile {
  return { ...raw, steps: raw.steps.map(withNext) };
}

const FILES: Record<Product, unknown> = {
  energie: energieJson,
  zonnepanelen: zonnepanelenJson,
  thuisbatterij: thuisbatterijJson,
};

let flows: Record<Product, Flow> | undefined;

/** The resolved nl flows by product, as the form pages resolve them (cached). */
export function serverFlows(): Record<Product, Flow> {
  if (flows) return flows;
  const shared = normaliseSharedFile(sharedJson as unknown as RawSharedFile);
  const resolved = {} as Record<Product, Flow>;
  for (const product of PRODUCTS) {
    const file = normaliseFlowFile(FILES[product] as RawFlowFile);
    if (file.product !== product) {
      throw new Error(`src/content/flows/nl/${product}.json has product "${file.product}"`);
    }
    resolved[product] = resolveFlow(file, shared);
  }
  flows = resolved;
  return flows;
}

/** The form's interface copy (nl/_copy.json): the payload's yes/no label fallback. */
export function serverFlowCopy(): FlowCopy {
  return copyJson as unknown as FlowCopy;
}

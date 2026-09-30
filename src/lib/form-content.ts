// Loads the form content at build time (docs/FLOWS.md step 1): the locale's flows resolved with
// its shared steps and switches, and its interface copy. The island gets the result as props.
import { getCollection } from 'astro:content';

import { resolveFlow } from './flow/resolve';
import type { Flow, FlowCopy } from './flow/schema';
import { PRODUCTS, type Product } from './flow/types';

export type FormContent = { flows: Record<Product, Flow>; copy: FlowCopy };

export async function loadFormContent(locale = 'nl'): Promise<FormContent> {
  const inLocale = (id: string) => id.startsWith(`${locale}/`);
  const [flowEntries, sharedEntries, copyEntries] = await Promise.all([
    getCollection('flows', (entry) => inLocale(entry.id)),
    getCollection('flowSteps', (entry) => inLocale(entry.id)),
    getCollection('flowCopy', (entry) => inLocale(entry.id)),
  ]);
  const copy = copyEntries[0]?.data;
  if (!copy) throw new Error(`src/content/flows/${locale}/_copy.json is missing`);
  const shared = sharedEntries[0]?.data;
  const flows = {} as Record<Product, Flow>;
  for (const product of PRODUCTS) {
    const entry = flowEntries.find((candidate) => candidate.data.product === product);
    if (!entry) throw new Error(`no ${locale} flow for "${product}" in src/content/flows`);
    flows[product] = resolveFlow(entry.data, shared);
  }
  return { flows, copy };
}

// What the results and ordering pages pass to their islands: the copy, the comparison (today the
// placeholders), the single-page form's option labels and the icons they show.
import { iconUrl } from '../assets';
import type { Flow } from '../flow/schema';
import { loadFormContent } from '../form-content';
import { orderCopy } from './copy';
import { placeholderComparison } from './placeholder';

/** field id → option code → label, for the select and choice fields of a flow. */
export function optionLabels(flow: Flow): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const step of flow.steps) {
    for (const field of step.fields) {
      if (field.type === 'single_choice' || field.type === 'select') {
        out[field.id] = Object.fromEntries(field.options.map((o) => [o.code, o.label]));
      }
    }
  }
  return out;
}

export async function orderPageData() {
  const { byId } = await loadFormContent();
  const flow = byId.energie_vergelijker;
  if (!flow) throw new Error('src/content/flows/nl/energie_vergelijker.json is missing');
  const icons = Object.fromEntries(
    ['house-detached', 'house-semi-detached', 'house-terraced', 'house-apartment'].map((key) => [
      key,
      iconUrl(key),
    ]),
  );
  return {
    copy: orderCopy,
    comparison: placeholderComparison(),
    labels: optionLabels(flow),
    icons,
  };
}

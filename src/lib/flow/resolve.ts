// Fills a flow file's shared step references ({ "use": "postcode", "next": […] }) in from the
// locale's _shared.json, giving the flat Flow the engine runs. Called at build time (the page
// passes the resolved flow to the island) and by validate:flows.
import type { Flow, FlowFile, SharedStepsFile, Step } from './schema';

export class FlowResolveError extends Error {
  override name = 'FlowResolveError';
}

export function resolveFlow(file: FlowFile, shared: SharedStepsFile | undefined): Flow {
  const steps = file.steps.map((entry): Step => {
    if (!('use' in entry)) return entry;
    const found = shared?.steps.find((candidate) => candidate.id === entry.use);
    if (!found) {
      throw new FlowResolveError(`step "${entry.use}" is not defined in _shared.json`);
    }
    return { ...found, next: entry.next ?? found.next };
  });
  return { ...file, steps };
}

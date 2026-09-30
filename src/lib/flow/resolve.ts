// Fills a flow file's shared step references ({ "use": "postcode", "next": […] }) in from the
// locale's _shared.json, giving the flat Flow the engine runs, and applies the config switches:
// an option with `"requires": "<switch>"` is left out while that switch is off (brief §7.3: gas
// is a config switch). Called at build time (the page passes the resolved flow to the island)
// and by validate:flows.
import type { Flow, FlowFile, Option, SharedStepsFile, Step } from './schema';

export class FlowResolveError extends Error {
  override name = 'FlowResolveError';
}

export type ResolveOptions = {
  /**
   * Resolve as if every switch were on. validate:flows checks this version, so conditions may
   * compare with the codes of options a switch can take away.
   */
  allSwitchesOn?: boolean;
};

export function resolveFlow(
  file: FlowFile,
  shared: SharedStepsFile | undefined,
  { allSwitchesOn = false }: ResolveOptions = {},
): Flow {
  const switches = shared?.switches ?? {};
  const offered = (fieldId: string, option: Option): boolean => {
    if (option.requires === undefined) return true;
    if (!Object.hasOwn(switches, option.requires)) {
      throw new FlowResolveError(
        `field "${fieldId}": option "${option.code}" requires the switch "${option.requires}", which _shared.json "switches" does not define`,
      );
    }
    return allSwitchesOn || switches[option.requires] === true;
  };
  const withSwitches = (step: Step): Step => ({
    ...step,
    fields: step.fields.map((field) =>
      field.type === 'single_choice'
        ? { ...field, options: field.options.filter((option) => offered(field.id, option)) }
        : field,
    ),
  });

  const steps = file.steps.map((entry): Step => {
    if (!('use' in entry)) return withSwitches(entry);
    const found = shared?.steps.find((candidate) => candidate.id === entry.use);
    if (!found) {
      throw new FlowResolveError(`step "${entry.use}" is not defined in _shared.json`);
    }
    return withSwitches({ ...found, next: entry.next ?? found.next });
  });
  return { ...file, steps };
}

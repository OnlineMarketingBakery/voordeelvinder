# 0007 — Form flow content: gas switch, energy preselect, interface copy

- **Date:** 2026-09-30
- **Status:** Proposed (PR 15)
- **Brief:** §7.3 (gas "must be a config switch"; step 1 skipped on a preselect), §7.4 (DRAFT
  flows), §7.5, §7.6 (preselect, `?energie=`), §4.4 (no copy in components).

## Context

The flow engine and `validate:flows` (PR 14) run the questions from JSON. Writing the real
flows raised four points the brief doesn't settle:

1. Gas is TO CONFIRM and must be a config switch, but a `single_choice` has no way to offer an
   option conditionally.
2. `/vergelijken/energie` skips step 1, but without `?energie=` the energy type is then unknown,
   and every electricity or gas question depends on it.
3. The form needs interface copy the brief doesn't give (buttons, progress, error messages).
4. Several steps ask two questions and the brief (like Figma) gives no step title for them.

## Decision

1. **Switches.** `_shared.json` has `"switches": { "gas": true }`; an option can say
   `"requires": "gas"`. `resolveFlow` leaves such options out while the switch is off. An unknown
   switch fails `validate:flows`, which checks every flow with all switches on (so conditions may
   compare with gas codes) and checks that the switches as set leave every choice answerable.
   Switches must match across locales.
2. **Energy preselect without `?energie=`.** The energy flow has its own step `energy_choice`
   right after the shared `product` step: the same title and the three energy cards
   (`payload: none`, setting `energy_type`). It shows only when `derived.preselected` is true and
   `energy_type` is unknown, or once it has been answered, so it stays on the visitor's path.
   Plain flow conditions, no engine change; with `?energie=` it is skipped as the brief says.
3. **Interface copy** lives in one file per locale, `src/content/flows/<locale>/_copy.json`
   (schema `flowCopyFile`, collection `flowCopy`, checked by `validate:flows`): one message per
   validator error code (the schema requires them all), optional per-field-type `required`
   messages, warning messages (required once a number field has `softMin`/`softMax`), yes/no
   labels, buttons, progress and the e-mail suggestion. Copy not in the brief or Figma is
   PROPOSED (CONTENT-TODO 2.23).
4. **Two-question steps** use the first question as the step title and leave that field without
   a label; the second question is its field's label. A consent field can link words of its
   label (`links: [{ text, href }]`), for the brief's "[algemene voorwaarden]" and
   "[privacybeleid]".

Also: `knows_consumption`, `household` and `appliances` are shared steps, since the solar panel
and home battery drafts reuse them (brief §7.4), so their codes can't drift between flows.

## Consequences

- Turning gas off is a one-line change in `_shared.json` plus a redeploy. With gas off,
  `/vergelijken/energie` without `?energie=` asks a single "Elektriciteit" card; the island may
  later auto-select a lone option.
- The island must pass `derived.preselected` as a boolean and write a card's implied answer
  (`energy_type`) together with the choice (docs/FLOWS.md).
- Phase 5: `answerLabels` only knows yes/no labels set on the field; the server should fall back
  to `_copy.json` `yesNo` for the sheet's labels.

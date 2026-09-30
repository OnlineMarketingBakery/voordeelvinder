# 0006 — A small JSONLogic subset instead of json-logic-js

- **Date:** 2026-09-30
- **Status:** Accepted (Tanjil)
- **Brief:** §7.1 (conditions are JSONLogic, evaluated against answers plus `derived`; the build
  rejects unknown vars), §8 (qualification rules are JSONLogic too, server-side).

## Context

Flow conditions (`visibleIf` on steps and fields, `if` in `next`) are JSONLogic. The engine runs
in the browser, inside the form island, so every dependency ships to visitors on mobile and in
in-app browsers. `json-logic-js` supports far more than a form needs (string and array
operators, `map`/`reduce`, custom operators added at runtime), and its looseness is the
opposite of what `validate:flows` needs: a list of the operators and vars a rule uses, so it can
reject a typo before the build.

## Decision

- `src/lib/flow/logic.ts` implements a typed subset: `var` (dotted paths, optional default),
  `==`, `!=`, `===`, `!==`, `!`, `!!`, `and`, `or`, `in` (array membership and substring), `<`,
  `<=` (also as "between" with three arguments), `>`, `>=` and `if`. Semantics follow
  json-logic-js for these operators, with two deliberate restrictions: comparisons with `<`/`>`
  are only true for numbers, and `==` only coerces between primitives.
- A walker (`inspectLogic`) lists every var, every operator and structural problems without
  evaluating. The flow schema rejects unknown operators and malformed rules; `validate:flows`
  rejects unknown vars, vars read before their question is asked, and literals that aren't one
  of the field's option codes.
- No `eval`, no runtime registration of operators, no dependencies. `var` only reads own
  properties, so `constructor` or `__proto__` never resolve.

## Consequences

- A rule written for json-logic-js with an operator outside the subset fails the build; adding
  an operator means adding it to `OPERATORS`, the evaluator and the tests together.
- Phase 5 qualification rules (`src/server/rules/`) can use the same evaluator on the server.
  If they need an operator the form doesn't, it is added here, with a test. (Superseded by
  ADR 0009: qualification lives in n8n, so there are no rules on the site.)

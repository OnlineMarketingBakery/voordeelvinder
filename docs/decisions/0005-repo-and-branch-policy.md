# 0005 — GitHub repository and branch policy

- **Date:** 2026-09-29
- **Status:** Proposed. Waiting for Tanjil to decide on visibility.
- **Brief:** §4.5 ("GitHub, OnlineMarketingBakery org"), §4.6 (AI agents never push to `main`
  or `production`; CI must pass), §8 (rules are never sent to the browser).

## Context

- **Owner:** `OnlineMarketingBakery` is a personal GitHub **user** account, not an
  organisation. Org-only features such as bypass lists and "Restrict who can push" aren't
  available.
- **Visibility:** the repo is **public**. That makes the qualification rules
  (`src/server/rules/`, Phase 5), `docs/RULES.md`, the brief and the payload contract readable
  by anyone.
- **Cost of going private on the Free plan:**
  - Branch protection and rulesets on private repos need GitHub Pro ($4/month) for a user
    account.
  - Actions is capped at 2,000 minutes a month on smaller runners. At roughly 30–45 billed
    minutes per full CI run, that's tight for the small-PR workflow.
  - GitHub Pro raises the cap to 3,000 minutes a month.

## Proposal

1. **Make the repo private and add GitHub Pro.** Until then, keep `docs/BRIEF.md`, the rules
   files and `docs/RULES.md` out of the repo.
2. **Protect `main`, and later `production`, with a ruleset:**
   - pull request required, 0 approvals (the agent and Tanjil use the same account, and
     authors can't approve their own PRs);
   - the `ci-ok` status check required and up to date;
   - no bypass;
   - no force-push or deletion.
3. **PR screenshots** live on the orphan branch `pr-assets`, which is never merged or deployed.

---
name: e2e-testing
description: ECC-derived Playwright E2E patterns adapted for Ferragano's public funnel, auth, property search and lead flows.
---

# E2E Testing — Ferragano

Use Playwright for critical browser journeys and regressions.

## Required critical flows
- Public vitrine loads without console/runtime errors.
- Property search and filters work.
- Property detail exposes only public fields.
- Property consultation creates exactly one lead when submitted once.
- Lead carries property, source and UTM context when supplied.
- Authenticated routes redirect unauthenticated users safely.
- Authenticated dashboard shows the created lead in the correct workspace.
- Cross-workspace data is never visible.
- Session expiry/failure does not break the public shell.

## Stability rules
- Prefer semantic locators or stable `data-testid` values.
- Wait for observable network/UI conditions instead of arbitrary sleeps.
- Keep tests independent and create isolated test data.
- Capture screenshots/traces on failure.
- Quarantine flaky tests only with a documented reason; never silently skip critical coverage.

## CI
Run the repository's configured Playwright command. Validate Chromium at minimum; add mobile coverage for conversion-critical public flows when practical.

## Completion
A flow is only considered verified when the browser result and the relevant backend state agree.

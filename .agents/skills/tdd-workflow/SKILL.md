---
name: tdd-workflow
description: ECC-derived TDD workflow adapted for Ferragano feature work, bug fixes and refactors.
---

# TDD Workflow — Ferragano

Use for new features, bug fixes and refactors. Tests should describe the intended user-visible/business behavior before implementation when practical.

## Workflow
1. Identify the real test runner from package.json and existing tests; never assume a command.
2. Define the user journey and acceptance criteria.
3. Add or update the smallest relevant unit/integration/E2E test.
4. Run the test and establish RED when feasible.
5. Implement the smallest correct change.
6. Run targeted tests, then typecheck/lint/build as applicable.
7. Refactor only while tests remain green.
8. Verify critical flows and record remaining gaps.

## Ferragano priorities
- Leads and conversion flows
- Authentication/session boundaries
- Workspace isolation and authorization
- Public property/search flows
- Supabase queries/RLS
- Academy business rules
- AI/integration fallbacks

## Rules
- Prefer behavior over implementation-detail assertions.
- Keep tests isolated and deterministic.
- Use semantic Playwright selectors or stable data-testid attributes.
- Never weaken/remove a failing test just to get green.
- Do not claim coverage or validation that was not actually executed.
- Keep unrelated refactors out of feature/fix commits.

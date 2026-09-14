---
name: backend-patterns
description: ECC-derived backend architecture patterns adapted to Ferragano server functions, Supabase and multi-workspace boundaries.
---

# Backend Patterns — Ferragano

Use when implementing server functions, queries, mutations, integrations or domain workflows.

## Layering
ROUTE/UI → FEATURE → APPLICATION/SERVER FUNCTION → DOMAIN → INFRASTRUCTURE/SUPABASE

UI components must not contain authorization, raw Supabase mutation logic or integration secrets.

## Server-function rules
- Authenticate first for protected operations.
- Resolve user/workspace context from trusted auth claims; never trust client-supplied ownership identifiers.
- Validate external input with Zod.
- Scope every tenant query by workspace and, where required, user/role.
- Return stable client-safe error contracts.
- Keep external integrations behind service adapters.
- Make writes idempotent where duplicate submissions are possible.
- Keep telemetry and AI enrichment best-effort unless explicitly required by the business transaction.

## Supabase
- Prefer explicit column selection over `select('*')` for public/sensitive boundaries.
- Treat RLS as a defense layer, not the only authorization layer for sensitive application workflows.
- Review grants, SECURITY DEFINER functions, indexes and query plans for material operations.
- Never expose service-role credentials to the browser.

## Ferragano domains
Keep property, development, lead, opportunity, person, workspace, academy and observability concerns separated. Avoid giant generic services and cross-domain imports that bypass application boundaries.

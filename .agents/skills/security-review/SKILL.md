---
name: security-review
description: Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns.
---

# Security Review Skill

This skill ensures all code follows security best practices and identifies potential vulnerabilities.

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Implementing payment features
- Storing or transmitting sensitive data
- Integrating third-party APIs

## Project Rule

For Ferragano, adapt generic guidance to the existing React/TypeScript/Vite/TanStack/Supabase architecture. Prefer existing server functions, Zod validation, Supabase RLS, workspace isolation, and established auth helpers. Never introduce Next.js-specific infrastructure where it does not belong.

## Pre-Deployment Security Checklist

- [ ] No hardcoded secrets; production secrets remain in hosting environment
- [ ] External/user input validated with Zod or equivalent schemas
- [ ] Supabase queries remain parameterized and workspace-scoped
- [ ] Sensitive operations enforce authentication and authorization server-side
- [ ] RLS enabled and policies verified for tenant data
- [ ] Public DTOs expose only intentionally public fields
- [ ] Materialized/internal read models are not directly exposed to anon/authenticated clients
- [ ] SECURITY DEFINER functions have least-privilege EXECUTE grants
- [ ] Rate limits and abuse controls exist for public lead/search endpoints
- [ ] Errors returned to clients do not leak SQL, stack traces, secrets, or internal topology
- [ ] Telemetry is sanitized and never blocks authentication/session rendering
- [ ] Security-sensitive changes have automated tests

## Ferragano-specific verification

Before declaring a security change complete, test both `anon` and `authenticated`, test cross-workspace access, inspect grants/RLS, and validate the public property surface separately from internal commercial/scoring data.

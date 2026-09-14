---
name: database-migrations
description: ECC-derived safe database migration workflow adapted for Supabase/PostgreSQL.
---

# Database Migrations — Ferragano

Use for schema, grants, RLS, indexes, functions, views/materialized views and data migrations.

## Rules
- Every database change must be represented by a versioned migration.
- Prefer additive, backward-compatible changes before destructive changes.
- Inspect current schema/grants/policies before writing a migration.
- Keep migrations deterministic and safe to rerun where practical.
- Never disable RLS as a shortcut to make a feature work.
- Review `anon`, `authenticated`, `service_role` and function EXECUTE grants explicitly.
- Materialized/internal read models must not be directly exposed to untrusted clients.
- Public property data must use an explicit safe-column surface.
- Test tenant isolation and public access after security migrations.
- Regenerate application types after schema changes when the project workflow requires it.

## Deployment verification
1. Apply migration in a controlled environment.
2. Check migration status.
3. Run targeted SQL/security tests.
4. Run application typecheck/tests/build.
5. Verify public and authenticated behavior separately.
6. Verify no unrelated grants or policies were changed.

# CTR-AUTH-LOCKOUT-PERSISTENCE — Persistência Drizzle do account lockout (follow-up BE-REC-001)

> **Size:** M · **Épico:** `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md`.

## Escopo

Adapter Drizzle do `LoginLockoutStore` (tabela `auth_login_lockout`) — o lockout deixa de ser
in-memory no driver mysql e passa a **sobreviver a restart** (persistido). Espelha o reset-persistence.

## Critérios de aceite

- [x] Schema `auth_login_lockout` (PK = user_id, failed_attempts int, locked_until datetime nullable, FK→auth_user RESTRICT, CHECK attempts ≥ 0) + tipos `$infer`.
- [x] Mapper `account-lockout.mapper.ts` (row↔domínio, tagged errors) + teste round-trip.
- [x] Repo Drizzle `login-lockout-store.drizzle.ts` (findByUserId PK; save upsert por user_id via SELECT FOR UPDATE → UPDATE/INSERT, sem ON DUPLICATE KEY).
- [x] Composition: `lockoutStore` movido para `Stores` (InMemory memory / Drizzle mysql).
- [x] Migration `0002_sweet_the_watchers.sql` + hardening manual (COLLATE/CHARSET).
- [x] typecheck + lint + format + testes auth verdes.

## Pendência

- Integração MySQL não exercida (porta 3306 ocupada). Mapper coberto por teste unitário; repo Drizzle espelha os validados.

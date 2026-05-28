# W1 — Implementação GREEN · AUTH-AGG-ROLE

- **Wave:** W1 (GREEN) · **Skill:** `ts-domain-modeler` · **Data:** 2026-05-27 · **Outcome:** GREEN (11/11 · typecheck + lint limpos)

## Arquivos criados

- `src/modules/auth/domain/authorization/role-id.ts` — `RoleId` + `generate` + `rehydrate` (espelha `contract-id.ts`).
- `src/modules/auth/domain/authorization/role.ts` — agregado `Role` + `create`/`hasPermission`/`grant`/`revoke`.

## Aderência à SKILL `ts-domain-modeler`

- **Agregado não-brandado** (§3.A.1) — `Role = Readonly<{ id, name, permissions }>`; identidade via `id: RoleId`.
- **Imutabilidade** (§3.B.5) — `immutable()` em `create`/`grant`/`revoke`; arrays via `[...]`/`filter`, sem `push`/`splice`.
- **Padrão D**, return types explícitos, `import type` para `RoleId`/`Permission`.
- **YAGNI** — sem `RoleName` VO (validação inline), sem evento `RoleCreated` (fora do vocabulário do ADR-0024).

## Decisões aplicadas

- `RoleId` reusa `newUuid`/`isUuidV4` de `shared/utils/id.ts` (mesmo padrão dos IDs de `contracts`).
- `create` deduplica permissions com `new Set` (dedup por valor da string brandada).
- `grant` idempotente (no-op se já contém); `revoke` no-op se ausente. Ambos retornam novo `Role` congelado.

## Testes

```
ℹ tests 11
ℹ pass 11
ℹ fail 0
```
`pnpm run typecheck` e `pnpm run lint`: sem erros (incl. imutabilidade dos arrays — sem violação de lint).

## Checklist auto-revisão
- [x] Zero `throw`/`class`/`this`/`any`. Agregado não-brandado; cast `as RoleId` só no `role-id.ts`.
- [x] `readonly Permission[]`; mutação via spread/filter.
- [x] Return types explícitos; `import type`; `.ts`; ASCII puro; EN + erros kebab EN.
- [x] Sem import cross-módulo.

## Próxima wave
W2 (code review read-only).

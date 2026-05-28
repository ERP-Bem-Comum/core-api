# W1 — Implementação GREEN · AUTH-REPO-SESSION

- **Wave:** W1 (GREEN) · **Skill:** `ports-and-adapters` · **Data:** 2026-05-27 · **Outcome:** GREEN (5/5 · typecheck + lint + format limpos)

## Arquivos criados
- `src/modules/auth/domain/session/refresh-token-repository.ts` — `RefreshTokenRepository { save, findById, findByTokenHash }`.
- `src/modules/auth/adapters/persistence/repos/refresh-token-repository.in-memory.ts` — `makeInMemoryRefreshTokenStore()`.

## Aderência (DD-PORTS-01)
- Repo no domínio (§3.H.2); 1 port. `findByTokenHash` = lookup do fluxo de refresh. Contract-suite reutilizável.

## Testes
```
ℹ tests 5 · pass 5 · fail 0
```
`typecheck`/`lint`: limpos. `format`: 1 reformatação cosmética (quebra de linha no port) via `prettier --write`.

## Próxima wave
W2.

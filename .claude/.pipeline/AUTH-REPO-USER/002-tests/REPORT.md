# W0 — Testes RED · AUTH-REPO-USER

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED
- **Decisão:** DD-PORTS-01 (repo no domínio, read/write split).

## Artefatos

- `tests/modules/auth/adapters/persistence/user-repository.contract.ts` — suite parametrizada `runUserRepositoryContract(label, factory)` (não executa direto).
- `tests/modules/auth/adapters/persistence/user-repository.inmemory.test.ts` — roda a suite contra o InMemory.

## Mapa CA → teste (na contract-suite)

| CA | Caso |
| :-- | :-- |
| CA1 | `save` → `findById` retorna o user |
| CA2 | `findById` inexistente → `ok(null)` |
| CA3 | `save` → `findByEmail` retorna o user |
| CA4 | `findByEmail` inexistente → `ok(null)` |
| CA5 | `save` mesmo id = upsert (status atualizado para `disabled`) |
| CA6 | suite reutilizável por qualquer adapter (estrutura parametrizada) |

## Saída (RED)

```
code: 'ERR_MODULE_NOT_FOUND'
ℹ tests 1 · pass 0 · fail 1
```
Falta `domain/identity/user/repository.ts` (port) e `adapters/persistence/repos/user-repository.in-memory.ts`. `src/` intocado.

## Decisões para o W1

- Ports: `UserRepository { save }` + `UserReader { findById, findByEmail }`; erro `'user-repo-unavailable'`. `save` sem `events` (sem outbox ainda).
- InMemory: `makeInMemoryUserStore()` → `{ repository, reader }` sobre um `Map<UserId, User>` compartilhado; `findByEmail` por varredura (e-mail já normalizado no VO).

# W0 — RED Report — CTR-SHARED-VO-CANONICAL

> **Status:** ✅ RED auditável: **122 falhas de invariante + 4 ERR_MODULE_NOT_FOUND**.
> **Skill:** [`tdd-strategist`](../../../skills/tdd-strategist/SKILL.md) + [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 1ª de 4 invocações.
> **Nota de protocolo:** Subagent não escreve em `.claude/.pipeline/*`. Conteúdo devolvido via sumário e escrito por Claude principal.

---

## Status final

| Métrica | Valor |
| :--- | :--- |
| Test files atualizados | 6 (`money`, `period`, `bucket-name`, `storage-key`, `storage-ref`, `ids`) |
| Test files novos | 4 (`contract-id`, `amendment-id`, `document-id`, `user-ref`) — fragmentação CA-5 |
| Total de test files | 10 |
| Total de tests registrados | 125 (+ 4 falhas catastróficas pré-coleta) |
| Passing | 3 |
| Failing | 122 |
| Catastrophic load failures | 4 (`ERR_MODULE_NOT_FOUND`) |

## Per-file breakdown

| File | tests | pass | fail | Catastrophic? |
| :--- | ---: | ---: | ---: | :---: |
| `money.test.ts` | 32 | 2 | 30 | — |
| `period.test.ts` | 24 | 0 | 24 | — |
| `bucket-name.test.ts` | 26 | 0 | 26 | — |
| `storage-key.test.ts` | 21 | 0 | 21 | — |
| `storage-ref.test.ts` | 15 | 0 | 15 | — |
| `ids.test.ts` | 3 | 1 | 2 | — |
| `contract-id.test.ts` | 1 | 0 | fail | sim — `ERR_MODULE_NOT_FOUND` |
| `amendment-id.test.ts` | 1 | 0 | fail | sim |
| `document-id.test.ts` | 1 | 0 | fail | sim |
| `user-ref.test.ts` | 1 | 0 | fail | sim |
| **TOTAL** | **125** | **3** | **122** | **4** |

## Categorias de RED

### A. `ERR_MODULE_NOT_FOUND` (4 arquivos)

`contract-id.ts`, `amendment-id.ts`, `document-id.ts`, `user-ref.ts` ainda não existem em `src/modules/contracts/domain/shared/` — serão criados em W1 (CA-5).

### B. Falha de invariante semântica (122 tests)

Os 6 test files dos VOs existentes agora consomem `import * as Money from './money.ts'`. Como `src/` ainda usa namespace-object legado:

```
shape atual:   { Money: { fromCents, zero, ... }, MoneyError }
shape canônico esperado: { ZERO, fromCents, add, subtract, equals, greaterThan, Money (type), MoneyError }
```

Disparos de RED:
1. `Money.fromCents(...)` → `TypeError: Money.fromCents is not a function` (vive em `Money.Money.fromCents`).
2. `Money.ZERO` → `undefined`.
3. `Object.isFrozen(...)` → `false` (atual não chama `immutable()`).
4. Smoke "does NOT expose nested namespace-object" falha porque `ns.Money` ainda é `{...}`.

## Cobertura nova adicionada (template canônico)

### `money.test.ts`
- `Money — module-as-namespace (Padrão D)` smoke + ausência de nested namespace-object.
- `Money — ZERO constant (DO B§10)`: existe, é `cents: 0`, é frozen, **não é função** `zero()`.
- `fromCents`/`add`/`subtract` retornam objetos frozen.
- `frozen object rejects mutation em strict mode`.

### `period.test.ts`
- Padrão D smoke + ausência de namespace.
- `create`/`createIndefinite` retornam objetos frozen.

### `bucket-name.test.ts` / `storage-key.test.ts`
- Padrão D smoke. Sem `Object.isFrozen` (Brand<string> é primitivo).

### `storage-ref.test.ts`
- Padrão D smoke + `Object.isFrozen` no objeto composto retornado.

### `ids.test.ts` (slim-down)
- Cobre só o barrel reexportando funções prefixadas (`contractIdGenerate`, `contractIdRehydrate`, etc).

### `contract-id.test.ts`/`amendment-id.test.ts`/`document-id.test.ts`/`user-ref.test.ts` (NOVOS)
- Espelham antiga `runIdNamespaceSuite` em arquivos dedicados.
- `generate` (só ContractId/AmendmentId/DocumentId): UUID v4 distinto.
- `rehydrate`: aceita v4 canônico/uppercase, rejeita empty/non-UUID/v1/trailing-whitespace.
- `UserRef` **não tem** `generate` (vem de fora do sistema).

## Compliance

AAA literal em todos os `it`'s novos. Zero `throw`/`class`/`any`/`let reatribuído`. Imports `.ts`. `import type` quando puro tipo.

## Critérios de saída W0

- [x] Test files refatorados existem e falham antes do W1 (CA-1).
- [x] Cobertura mapeia CAs 2-8 (verificáveis em W1).

→ **Pronto para W1 — desafio real do ticket grande (refator + codemod big-bang).**

---

## Observação sobre o protocolo Opção B em escala

**Wave W0 deste ticket é qualitativamente maior** que as 4 anteriores (escopo 7 VOs vs 1). Agent W0:
- ✅ Completou em 1 turno (`tool_uses: 34`, `duration_ms: ~454s`).
- ✅ Não estourou contexto.
- ✅ Encerrou limpamente (sem `agentId` órfão funcional).

Aponta que **Opção B aguenta escopo grande em wave de leitura+escrita de tests**. W1 (que mexe em src/ + ~80-150 call sites) é o teste real.

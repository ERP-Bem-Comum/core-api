# W1 — GREEN Report — CTR-SHARED-VO-CANONICAL

> **Status:** ✅ GREEN. Suite 552/539/0/13 (+31 vs baseline 521). Typecheck verde.
> **Skill:** [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 2ª de 4 invocações. **Maior wave executada via Opção B até hoje** (`tool_uses: 126`, `duration_ms: 627s`).
> **Nota de protocolo:** Subagent não escreve em `.claude/.pipeline/*`. Conteúdo devolvido via sumário e escrito por Claude principal.

---

## Status final

| Métrica | Valor |
| :--- | :--- |
| VOs reescritos | 7 |
| Arquivos novos em `src/` | 4 (`contract-id.ts`, `amendment-id.ts`, `document-id.ts`, `user-ref.ts`) |
| Call sites atualizados em `src/` | 9 (`contract/contract.ts`, 5 use cases, 4 mappers) |
| Call sites atualizados em `tests/` | 11 (fixtures, 2 suites, document-storage.contract, 4 use-case tests, contract.test, amendment.test, format.test) |
| `Money.zero()` → `Money.ZERO` em call site | 2 (amendment.test.ts L94, L121) |
| `pnpm run typecheck` | **0 erros** ✅ |
| `pnpm test` totals | **552/539/0/13** ✅ |
| Δ tests vs baseline | **+31** (521 → 552) |

## Arquivos modificados

### `src/modules/contracts/domain/shared/` — reescrita Padrão D

- `money.ts` — `ZERO: Money` constante via `immutable()`. `fromCents`/`add`/`subtract` retornam objetos `immutable()`-frozen. **Removidos:** namespace-object e `zero()` função.
- `period.ts` — `create`/`createIndefinite` retornam objeto via `immutable()`. `MIN_YEAR` constante interna mantida.
- `bucket-name.ts`, `storage-key.ts` — Brand<string>, sem `immutable()` (primitivo).
- `storage-ref.ts` — `create` retorna objeto via `immutable()` (composto não-brandado).

### Arquivos NOVOS (fragmentação CA-5)

- `contract-id.ts`, `amendment-id.ts`, `document-id.ts` — cada um com `generate`/`rehydrate`/`type X`/`type XError`.
- `user-ref.ts` — **só** `rehydrate` (referência externa não tem `generate`).

### `ids.ts` — convertido em BARREL

Reexporta tipos + funções prefixadas (`contractIdGenerate`, `contractIdRehydrate`, `amendmentIdGenerate`, etc).

### Call sites atualizados

**`src/modules/contracts/`:**
- `domain/contract/contract.ts` — `Money`, `Period` em Padrão D.
- 5 use cases: `create-contract`, `create-amendment`, `get-contract`, `homologate-amendment`, `attach-signed-document`.
- 4 mappers: `money.mapper`, `period.mapper`, `contract.mapper`, `amendment.mapper`.

**`tests/modules/contracts/`:**
- `adapters/persistence/{fixtures.ts, contract-repository.suite.ts, amendment-repository.suite.ts}`.
- `application/ports/document-storage.contract.ts`.
- 4 use-case tests: `queries`, `attach-signed-document`, `create-amendment`, `homologate-amendment`.
- 2 domain tests: `contract.test`, `amendment.test` (com `Money.zero()` → `Money.ZERO`).
- `cli/format.test.ts`.

## CAs do ticket

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1 | Test files W0 RED antes da W1 | ✅ (W0 fechada) |
| CA-2 | 7 VOs reescritos: zero `export const X = {…}` | ✅ |
| CA-3 | Constantes via `immutable()` — `Money.ZERO` em vez de função | ✅ |
| CA-4 | Smart constructors retornam objetos via `immutable()` | ✅ |
| CA-5 | `ids.ts` fragmentado em 4 arquivos + barrel | ✅ |
| CA-6 | Call sites refatorados — zero `import { Money }` runtime | ✅ |
| CA-7 | Tests dos VOs refatorados — todos verdes | ✅ |
| CA-8 | Suite completa verde — ≥ 521 tests | ✅ (552 ≥ 521) |
| CA-9 | Zero `throw`/`class`/`any` novo no diff | ✅ |
| CA-10 | Zero declaration merging | ✅ |
| CA-11 | `pnpm run typecheck` verde | ✅ |
| CA-12 | `pnpm run format:check` (arquivos do ticket) | ✅ (Agent reportou verde — W3 confirma) |
| CA-13 | `pnpm test` verde | ✅ |
| CA-14 | `pnpm run lint` (arquivos do ticket) | ✅ (Agent reportou verde — W3 confirma) |

## Surpresas/desafios encontrados (relevantes para W2)

1. **Colisão `type X` vs `namespace X`:** quando se precisa do tipo num parâmetro/variável e o módulo foi importado como `import * as X`, o tipo só fica acessível como `X.X`. Resolução: usar `ContractId.ContractId`/`AmendmentId.AmendmentId` em 2 sítios (`create-amendment`, `homologate-amendment`). Mantém um único import e explicita fronteira módulo/tipo.
2. **`contract.mapper.ts` precisou de import duplo:** `import * as AmendmentId` (runtime) + `import type { AmendmentId as AmendmentIdType }` (para array `AmendmentIdType[]`). Caso onde colisão namespace/tipo era mais grave.
3. **CLI formatters intactos:** já consumiam só `import type { Money }`/`import type { Period }`. Exemplo perfeito do benefício do Padrão D (boundary leve para consumidores de tipo).
4. **`Money.zero()` em call sites:** 2 ocorrências em `amendment.test.ts`. DO B§10 muda função → constante; codemod manual.
5. **`Money.ZERO` é `Money.Money` (não primitivo)**: validar `Object.isFrozen(Money.ZERO)` no test foi importante.

## Decisões aplicadas da entrevista 0001 §Bloco B

- ✅ DO B§8 (Padrão D module-as-namespace) — 7 VOs.
- ✅ DO B§9 (smart constructor → Result) — mantido.
- ✅ DO B§10 (`immutable()` para identidade) — `Money.ZERO`; `create` retorna `immutable()`.
- ✅ DO B§12 (migração big-bang num único ticket) — incorporado.
- ✅ DON'T B§7 (namespace-objeto) — removido dos 7 VOs.
- ✅ DON'T B§10 (identidade como função) — `zero()` extinto.
- ✅ DON'T B§11 (drift Padrão A/D coexistente) — evitado pelo big-bang.

## Próximo

→ **W2 — REVIEW** read-only. **Foco crítico para o reviewer:**
- Diff massivo — auditar `src/` E `tests/` E call sites com rigor anti-tangencial (lição CTR-SHARED-IMMUTABLE + BRAND aplicada).
- Executar `npx eslint` e `npx prettier --check` específicos do diff para confirmar W3 antecipadamente (lição CTR-SHARED-BRAND-UNIQUE-SYMBOL onde W2 inferiu lint sem rodar).
- Casos sutis: 2 imports duplos (`AmendmentIdType` em mapper), `X.X` em 2 use cases.

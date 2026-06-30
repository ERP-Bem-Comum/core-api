# W1 — GREEN Report — CTR-DOMAIN-TAGGED-ERRORS

> **Status:** ✅ GREEN — 0 fails / 595 tests (582 pass + 13 skip). Typecheck verde.
> **Skill:** [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 2ª de 4 invocações.

---

## Arquivos modificados (10)

| Arquivo | Ação | Δ LOC |
| :--- | :--- | ---: |
| `src/modules/contracts/domain/contract/errors.ts` | **reescrito** (14 variants + 14 ctors) | ~+155 |
| `src/modules/contracts/domain/amendment/errors.ts` | **reescrito** (9 variants + 9 ctors) | ~+75 |
| `src/modules/contracts/domain/contract/contract.ts` | 14 call sites + helpers tipados | ~+20 |
| `src/modules/contracts/domain/amendment/amendment.ts` | 6 call sites | ~+5 |
| `src/modules/contracts/cli/formatters/error.ts` | input alargado + dicionário PascalCase | ~+30 |
| `tests/modules/contracts/adapters/persistence/fixtures.ts` | `unwrap` aceita `error: unknown` | ~+5 |
| `tests/modules/contracts/application/use-cases/homologate-amendment.test.ts` | 3 asserts kebab → tag | 0 |
| `tests/modules/contracts/application/use-cases/create-amendment.test.ts` | 1 assert | 0 |
| `tests/modules/contracts/application/use-cases/create-contract.test.ts` | 1 assert | 0 |
| `tests/modules/contracts/application/use-cases/attach-signed-document.test.ts` | 1 assert | 0 |

## Padrões aplicados (Bloco D)

- **DO D§22** — Tagged shape `Readonly<{ tag: 'PascalCase', ...payload }>`. Case constructors free functions. Consumo via `import * as ContractError from './errors.ts'`.
- **DO D§23** — Payload de evidência apenas em invariantes runtime (6 em Contract + 1 em Amendment).
- **DO D§24** — Tag PascalCase / ctor camelCase. Helpers (`assertActive`/`assertPending`) declaram subtipo exato (`Result<T, ContractError.ContractNotActive>`).
- **DON'T D§21** — Zero namespace-objeto aninhado.
- **DON'T D§22** — Erros de invariante carregam as duas peças de evidência que colidiram.

## Decisão out-of-scope (necessária)

**CLI formatter alargado.** `formatErrorCode(code: string)` quebrava no typecheck dos 4 commands CLI porque `r.error` virou objeto. Solução:
1. Input alargado para `string | Readonly<{ tag: string }>`.
2. Guard `isTagged` (`typeof obj === 'object' && obj !== null && typeof obj.tag === 'string'`).
3. Dicionário com **chaves duplas** (kebab antigo + PascalCase novo) — compat retrô + idempotência. Mappers/repos podem ainda emitir string legada via Result propagation.

Preservou `format.test.ts` que ainda chama `formatErrorCode('contract-not-active')` sem regressão.

## Verificação

### 4 test files alvo (W0 → W1)
```
ℹ tests 104
ℹ pass 104
ℹ fail 0
```

### Suite completa
```
ℹ tests 595
ℹ pass 582
ℹ fail 0
ℹ skipped 13
ℹ duration_ms 38493
```

### Typecheck
```
$ pnpm run typecheck
(saída vazia — exit 0)
```

### Grep regressão (esperado 0 em domain agregados)
```
$ grep -rn "err('contract-\|err('amendment-" src/modules/contracts/domain/
src/modules/contracts/domain/shared/contract-id.ts:14: ... err('contract-id-invalid')
src/modules/contracts/domain/shared/amendment-id.ts:14: ... err('amendment-id-invalid')
```

**Esses 2 hits são erros dos VOs (IDs)**, fora do escopo do ticket (que cobre apenas agregados Contract/Amendment). Os tipos `ContractIdError`/`AmendmentIdError` são distintos de `ContractError`/`AmendmentError` — não foram alvo da migração.

## CAs fechados em W1

| CA | Critério | Status |
| :--- | :--- | :---: |
| CA-2 | tagged variants + case ctors PascalCase/camelCase | ✅ |
| CA-3 | zero string literal em `errors.ts` (só em `tag:` values) | ✅ |
| CA-4 | case ctors são free functions | ✅ |
| CA-5 | invariantes carregam payload de evidência | ✅ |
| CA-6 | `contract.ts` consome `import * as ContractError` | ✅ |
| CA-7 | `amendment.ts` consome `import * as AmendmentError` | ✅ |
| CA-8 | tests usam `r.error.tag === 'PascalCase'` | ✅ |
| CA-9 | suite ≥ 564 baseline | ✅ (595 / 582 pass) |
| CA-11 | `pnpm run typecheck` verde | ✅ |

CA-10/12/13/14 → W2/W3.

## Surpresas e decisões

1. **CLI formatter precisou ajuste.** Não estava no briefing como "tocado em W0" — `formatErrorCode` recebia `string`. Resolvido com tipo `string | Readonly<{ tag }>` + chaves duplas no dicionário.
2. **6 tests de use case usavam string literal do domínio.** Não cobertos pelo W0 (cobriu só `contract.test.ts` e `amendment.test.ts`). Migração defensiva aplicada.
3. **Helpers tipados com subtipo exato** (DO D§24). `assertActive` declara `Result<T, ContractError.ContractNotActive>` — preserva narrowing nos chamadores.
4. **`isTagged` narrowing-guard** em `formatErrorCode` e `unwrap`: forma idiomática sob `noUncheckedIndexedAccess`. Documentado in-line.

## Compliance

- ✅ Zero `throw` novo em diff (domain).
- ✅ Zero `class`/`this`/`any` novo.
- ✅ `Readonly<>` em todos os tagged variants.
- ✅ `import type` puro para tipos.
- ✅ `.ts` em imports relativos.

## Próxima wave — W2

Foco crítico (lições aplicadas):
1. **Executar gates específicos do diff** (lição BRAND): `npx prettier --check` + `npx eslint` nos 10 arquivos.
2. **Auditar tests** (lição IMMUTABLE) — 31 it's novos + 31 asserts atualizados, todos com AAA?
3. **Validar decisões fora do briefing:**
   - CLI formatter alargado — risco de drift kebab/PascalCase?
   - 6 tests de use case migrados defensivamente — necessários ou redundantes?
4. **Subtipo exato em helpers** — narrowing flui corretamente nos chamadores?

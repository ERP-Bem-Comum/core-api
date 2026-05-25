# W0 — RED Report — CTR-DOMAIN-TAGGED-ERRORS

> **Status:** ✅ RED — 66 fails / 104 tests (4 arquivos).
> **Skill:** [`tdd-strategist`](../../../skills/tdd-strategist/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 1ª de 4 invocações.

---

## Sumário

| Arquivo | Ação | it's | Asserts tocados |
| :--- | :--- | ---: | ---: |
| `tests/modules/contracts/domain/contract/errors.test.ts` | **CRIADO** | 18 | — |
| `tests/modules/contracts/domain/amendment/errors.test.ts` | **CRIADO** | 13 | — |
| `tests/modules/contracts/domain/contract/contract.test.ts` | editado | (44 mantidos) | **20** |
| `tests/modules/contracts/domain/amendment/amendment.test.ts` | editado | (29 mantidos) | **11** |
| **Total** | | **31 novos / 73 mantidos = 104** | **31** |

## Convenções aplicadas

- AAA literal em todo `it` novo.
- Zero `throw`/`class`/`any` novo. Único cast `as unknown as Record<string, unknown>` em `errors.test.ts` para varredura defensiva (Padrão D check).
- Imports `.ts` (NodeNext) + subpath `#src/*`.
- Consumo canônico via `import * as ContractError from '...errors.ts'` (DO D§22).
- Tagged record shape `{ tag: 'PascalCase', ...payload? }` exigido em cada assert.

## Estrutura dos novos `errors.test.ts`

### `contract/errors.test.ts` (18 it's, 3 describes)

1. **`errors.ts — Padrão D (DO D§22)`** (3 it's): expõe case ctors como free functions; não expõe `ContractError.ContractError` aninhado (DON'T D§21); `import * as` funciona como canal canônico.
2. **`ContractError variants — tagged records (DO D§22 + D24)`** (14 it's):
   - 6 it's sobre erros **com payload de evidência** (D23): `contractNotActive(status)`, `contractCannotExpireYet`, `contractValueWouldGoNegative`, `contractPeriodExtensionNotAfterCurrentEnd`, `contractAmendmentAlreadyApplied`, `contractSequentialNumberInvalidFormat`.
   - 8 it's sobre erros **sem payload**: `*Required`, `*ValueZero`, `*InvalidEventDate`, etc. Confirma `Object.keys(e).length === 1`.
3. **`ContractError — tag PascalCase bate com nome do ctor (D24)`** (1 it parametrizado em 14 pares).

### `amendment/errors.test.ts` (13 it's, 3 describes)

Análogo. **8 sem payload + 1 com payload** (`amendmentNotPending(currentStatus)`).

## Asserts atualizados

### `contract.test.ts` — 20 asserts

Padrão idiomático aplicado:
```ts
if (!r.ok) {
  assert.equal(r.error.tag, 'ContractXxx');
  if (r.error.tag === 'ContractXxx') {
    assert.equal(r.error.payloadField, expected);
  }
}
```

A segunda guarda (`r.error.tag === 'ContractXxx'`) serve para *type narrowing* — W1 vai restringir o variant da discriminated union, permitindo acessar payload sem `as`.

20 asserts cobertos:
- 4 `ContractSequentialNumberRequired`/`ContractTitleRequired`/`ContractObjectiveRequired`/`ContractInvalidSignedAt`
- 4 `ContractSequentialNumberInvalidFormat` (com payload `attempted`)
- 1 `ContractOriginalValueZero`
- 1 `ContractCannotExpireYet` (com payload `currentEnd, attemptedAt`)
- 1 `ContractCannotExpireIndefinitePeriod`
- 4 `ContractNotActive` (com payload `currentStatus === 'Expired'` ou `'Terminated'`)
- 3 `ContractInvalidEventDate`
- 1 `ContractValueWouldGoNegative` (com payload `currentValue, attemptedDecrease`)
- 1 `ContractPeriodExtensionNotAfterCurrentEnd` (com payload `currentEnd, attemptedEnd`)
- 1 `ContractCannotExtendIndefinitePeriod`
- 1 `ContractAmendmentAlreadyApplied` (com payload `amendmentId`)

### `amendment.test.ts` — 11 asserts

Cobertos:
- 2 `AmendmentImpactValueZero`
- 1 `AmendmentInvalidNewEndDate`
- 2 `AmendmentNumberRequired`
- 1 `AmendmentDescriptionRequired`
- 1 `AmendmentInvalidCreatedAt`
- 1 `AmendmentDocumentAlreadyAttached`
- 2 `AmendmentNotPending` (com payload `currentStatus === 'Homologated'`)
- 1 `AmendmentWithoutSignedDocument`
- 1 `AmendmentInvalidEventDate`

## Resultado RED

```
$ node --test --experimental-strip-types --no-warnings \
    tests/modules/contracts/domain/contract/errors.test.ts \
    tests/modules/contracts/domain/amendment/errors.test.ts \
    tests/modules/contracts/domain/contract/contract.test.ts \
    tests/modules/contracts/domain/amendment/amendment.test.ts

ℹ tests 104
ℹ pass 38
ℹ fail 66
ℹ duration_ms 172.2
```

### Quebra por arquivo

| Arquivo | tests | pass | fail |
| :--- | ---: | ---: | ---: |
| `contract/errors.test.ts` | 18 | 1 | 17 |
| `amendment/errors.test.ts` | 13 | 1 | 12 |
| `contract/contract.test.ts` | 44 | 19 | 25 |
| `amendment/amendment.test.ts` | 29 | 17 | 12 |

### Causas raiz das 66 falhas (todas esperadas)

1. **`TypeError: ContractError.xxx is not a function`** — case constructors ainda não existem em `errors.ts` (que hoje é só `export type ... = '...' | '...';`). Domina os 29 fails nos `errors.test.ts` novos.
2. **`AssertionError: undefined === 'ContractXxx'`** — em `contract.test.ts` e `amendment.test.ts`, `r.error` ainda é string literal antiga; `r.error.tag` é `undefined`. Domina os 37 fails restantes.
3. **38 que passam** são happy paths que não tocam o canal de erro — confirmam não-regressão.

## CAs (W0)

| CA | Status |
| :--- | :---: |
| CA-1 (RED antes de W1) | ✅ |
| CA-1a (2 errors.test.ts criados) | ✅ |
| CA-1b (31 asserts atualizados) | ✅ |
| CA-1c (RED tem causa única e legível) | ✅ |

## Próxima wave — W1

1. Reescrever `src/modules/contracts/domain/contract/errors.ts` (14 tagged variants + 14 case ctors).
2. Reescrever `src/modules/contracts/domain/amendment/errors.ts` (9 variants + 9 ctors).
3. Migrar ~14 call sites em `contract.ts` + ~6 em `amendment.ts` para `import * as ContractError` + `err(ContractError.xxx(...))`.

Critério de saída: 66 fails → 0 + suite ≥ 564 baseline + typecheck verde.

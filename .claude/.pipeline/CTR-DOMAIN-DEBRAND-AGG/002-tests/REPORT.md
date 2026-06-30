# W0 — RED Report — CTR-DOMAIN-DEBRAND-AGG

> **Status:** ✅ RED canônico — 2 arquivos abortam no parse (`SyntaxError`: `updateContract`/`updateAmendment` não exportados).
> **Skill:** [`tdd-strategist`](../../../skills/tdd-strategist/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 1ª de 4 invocações.
> **Nota de protocolo:** Subagent não escreve em `.claude/.pipeline/*`. Conteúdo devolvido via sumário.

---

## Arquivos editados

| Arquivo | Linhas adicionadas | Novos `it()` |
| :--- | :---: | :---: |
| `tests/modules/contracts/domain/contract/contract.test.ts` | +109 | 7 |
| `tests/modules/contracts/domain/amendment/amendment.test.ts` | +75 | 5 |

**Total:** 12 `it`'s novos + 2 imports RED a nível de módulo.

## Estrutura

### `contract.test.ts`

```ts
import { updateContract } from '#src/modules/contracts/domain/contract/types.ts';  // ← RED

describe("Contract — desbrandado (Bloco A DON'T §1)", () => {
  it('Contract não tem propriedade __brand em runtime', …);
  it('valor brandado-como-Contract é estruturalmente compatível com ContractShape', …);
});

describe('updateContract — helper canônico (DO A§4)', () => {
  it('exporta updateContract com assinatura esperada', …);
  it('retorna nova instância (não muta prev)', …);
  it('mescla patch em prev preservando campos não-tocados', …);
  it('CA-9 — Object.isFrozen(updateContract(c, {})) é true', …);
  it('aceita patch parcial — não exige todos os campos mutáveis', …);
});
```

### `amendment.test.ts`

```ts
import { updateAmendment } from '#src/modules/contracts/domain/amendment/types.ts';  // ← RED

describe("Amendment — desbrandado (Bloco A DON'T §1)", () => {
  it('Amendment não tem propriedade __brand em runtime', …);
});

describe('updateAmendment — helper canônico (DO A§4)', () => {
  it('exporta updateAmendment com assinatura esperada', …);
  it('retorna nova instância (não muta prev)', …);
  it('CA-10 — Object.isFrozen(updateAmendment(a, {})) é true', …);
  it('preserva discriminated union — kind e variant não mudam', …);
});
```

## Saída de execução (RED)

```
$ node --test --experimental-strip-types --no-warnings \
    tests/modules/contracts/domain/contract/contract.test.ts \
    tests/modules/contracts/domain/amendment/amendment.test.ts

SyntaxError: The requested module '.../contract/types.ts' does not provide an export named 'updateContract'
SyntaxError: The requested module '.../amendment/types.ts' does not provide an export named 'updateAmendment'

ℹ tests 2
ℹ pass 0
ℹ fail 2
ℹ duration_ms 104.42
```

Os arquivos abortam **no parse** (antes de qualquer `it` rodar) — sinal canônico Beck "API pretendida ainda não existe".

## Cobertura de CAs (W0)

| CA | Como o RED endereça | Status |
| :--- | :--- | :---: |
| CA-1 | Tests existem e falham antes do W1 | ✅ (2 arquivos fail) |
| CA-3 | `updateContract`/`updateAmendment` exportados + retornam frozen | ✅ asserts criados |
| CA-9 | `Object.isFrozen(updateContract(c, {}))` é `true` | ✅ `it` dedicado |
| CA-10 | `Object.isFrozen(updateAmendment(a, {}))` é `true` | ✅ `it` dedicado |

CA-2/4/5/6/7 endereçados indiretamente: quando W1 remover Brand e os 10 casts, qualquer regressão estrutural quebra alguma assertiva existente da suite.

## Compliance (lições acumuladas)

- ✅ AAA literal em todos os 12 `it`'s novos.
- ✅ Zero `throw` novo / `class` / `any` / `let reassign`.
- ✅ `import type` preservado para tipos.
- ✅ Imports com `.ts` (NodeNext).
- ✅ Subpath `#src/*`.

## Próxima wave

→ **W1 — GREEN** com [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md):

1. `contract/types.ts` — remover `Brand<ContractShape, 'Contract'>` → `Contract = Readonly<ContractShape>`; adicionar `ContractImmutableField`, `ContractUpdate`, `updateContract`.
2. `amendment/types.ts` — análogo para `Amendment` (cast `as Amendment` no retorno de `updateAmendment` por narrowing do discriminated union — não `as unknown as`).
3. `contract/contract.ts` — remover 7× `as unknown as ContractEntity`; usar `updateContract` nas transições.
4. `amendment/amendment.ts` — remover 3× `as unknown as AmendmentEntity`; usar `updateAmendment` em `attachSignedDocument` e `homologate`.
5. Usar `immutable()` de `shared/immutable.ts` (consistência com CTR-SHARED-IMMUTABLE ✅).

Critério de saída: 12 `it`'s passam + suite ≥ 552 (CA-7) + `tsc --noEmit` verde.

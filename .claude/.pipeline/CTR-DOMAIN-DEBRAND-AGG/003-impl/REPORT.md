# W1 — GREEN Report — CTR-DOMAIN-DEBRAND-AGG

> **Status:** ✅ GREEN. Suite 564/551/0/13 (+12 vs baseline 552). Typecheck verde. 10 casts inseguros eliminados.
> **Skill:** [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 2ª de 4 invocações.
> **Nota de protocolo:** Subagent não escreve em `.claude/.pipeline/*`. Conteúdo devolvido via sumário.

---

## Arquivos modificados

| Arquivo | LOC final | Delta | Casts removidos |
| :--- | :---: | :---: | :---: |
| `src/modules/contracts/domain/contract/types.ts` | 96 | +55 | — (Brand removido) |
| `src/modules/contracts/domain/amendment/types.ts` | 104 | +56 | — (Brand removido) |
| `src/modules/contracts/domain/contract/contract.ts` | 203 | ~0 | **7× `as unknown as ContractEntity`** |
| `src/modules/contracts/domain/amendment/amendment.ts` | 147 | +6 | **3× `as unknown as AmendmentEntity`** |

**Total:** 4 arquivos editados, **10 casts inseguros removidos**, 2 helpers canônicos adicionados.

## Mudanças principais

### `contract/types.ts`
- ❌ `export type Contract = Brand<ContractShape, 'Contract'>;`
- ✅ `export type Contract = Readonly<{ … }>;` (shape inline)
- ✅ `type ContractImmutableField = 'id' | 'sequentialNumber' | 'title' | 'objective' | 'signedAt' | 'originalValue' | 'originalPeriod';`
- ✅ `export type ContractUpdate = Partial<Omit<Contract, ContractImmutableField>>;`
- ✅ `export const updateContract = (prev, patch): Contract => immutable({ ...prev, ...patch });`

### `amendment/types.ts`
- ❌ `export type Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>;`
- ✅ `export type Amendment = AmendmentBase & AmendmentVariant;`
- ✅ `type AmendmentImmutableField = 'id' | 'contractId' | 'amendmentNumber' | 'description' | 'createdAt' | 'kind' | 'impactValue' | 'newEndDate';`
- ✅ `export const updateAmendment = (prev, patch): Amendment => immutable({ ...prev, ...patch }) as Amendment;` (cast estreito documentado — narrowing da discriminated union)

### `contract/contract.ts`
- **`create` (L67):** literal frozen via `immutable({...})`; `'Active' as const` + `[] as readonly never[]` para inferência sem cast.
- **6 transições:** `updateContract(prev, { ... })` substitui todos os `{ ...prev, ... } as unknown as ContractEntity`.

### `amendment/amendment.ts`
- **`create` (L72):** if-chain envolvida em `immutable(...)` com cast estreito `as AmendmentEntity` (NÃO `as unknown as`) — narrowing perdido em `?:`. Comentário in-line documenta.
- **`attachSignedDocument` (L98) / `homologate` (L129):** `updateAmendment(prev, { ... })`.

## Verificações

### Grep regression (após W1)
```
$ grep -rn "as unknown as ContractEntity\|as unknown as AmendmentEntity\|Brand<.*Contract\|Brand<.*Amendment" \
       src/modules/contracts/domain/{contract,amendment}/*.ts | grep -v -E "^\s*\*|^\s*//"

(saída vazia em código executável; apenas 2 hits em JSDoc documentando padrão antigo eliminado)
```

✅ CA-2/4/5 cumpridos.

### Testes específicos
```
$ node --test tests/modules/contracts/domain/contract/contract.test.ts tests/modules/contracts/domain/amendment/amendment.test.ts
ℹ tests 73 / pass 73 / fail 0
```

Todos os 12 `it`'s novos do W0 passam (CA-1, CA-3, CA-9, CA-10 cobertos behavioral).

### Suite completa
```
ℹ tests 564
ℹ pass 551
ℹ fail 0
ℹ skipped 13
ℹ duration_ms 40800
```

**564 = 552 baseline + 12 W0 = exato.** CA-7 cumprido.

### Typecheck
```
$ pnpm run typecheck
(saída vazia — exit 0)
```

CA-11 cumprido.

## CAs fechados em W1

| CA | Status |
| :--- | :---: |
| CA-2 (sem Brand) | ✅ |
| CA-3 (helpers + frozen) | ✅ |
| CA-4 (zero `as unknown as ContractEntity`) | ✅ |
| CA-5 (zero `as unknown as AmendmentEntity`) | ✅ |
| CA-6 (tests passam) | ✅ |
| CA-7 (suite ≥ 552) | ✅ (564) |
| CA-9 (Object.isFrozen Contract) | ✅ |
| CA-10 (Object.isFrozen Amendment) | ✅ |
| CA-11 (typecheck) | ✅ |

CA-8/12/13/14 → W2/W3.

## Decisões de design

1. **`updateContract` retorna sem cast.** Como `Contract` virou `Readonly<{...}>` puro (sem Brand), `{ ...prev, ...patch }` é estruturalmente `Contract` — TS aceita direto. Ganho técnico central do ticket.

2. **`updateAmendment` precisa de cast estreito `as Amendment`.** Spread sobre discriminated union "achata" o tipo, perde discriminator. Cast estreito reafirma invariante já garantido por `AmendmentImmutableField` (que inclui `kind`/`impactValue`/`newEndDate`). **Qualitativamente diferente de `as unknown as`** — não pula validação de propriedades.

3. **`create` do `Amendment` mantém cast estreito.** If-chain `?:` gera union "achatada"; limitação conhecida do TS. Cast `as AmendmentEntity` + comentário é a forma idiomática.

4. **`immutable()` em vez de `Object.freeze` direto.** Consistência com `CTR-SHARED-IMMUTABLE` (DO B§10).

## Compliance

- ✅ Zero `throw`/`class`/`this`/`any` novo no diff.
- ✅ `Readonly<>` em ambos os agregados.
- ✅ Discriminated union do `Amendment` preservada.
- ✅ Casts remanescentes (2) são **estreitos** + documentados in-line. Nunca `as unknown as`.

## Próxima wave

→ **W2 — REVIEW.** Foco crítico (lições aplicadas):
1. Confirmar zero `throw`/`class`/`any` (executar grep + lint específico).
2. Validar legitimidade dos 2 casts estreitos restantes (`updateAmendment` + `create` Amendment).
3. Verificar zero import circular (`types.ts` → `immutable.ts` + `contract.ts` → `types.ts`).
4. Executar `npx prettier --check` + `npx eslint` nos 4 arquivos do diff.
5. Auditar test files que foram tocados (lição CTR-SHARED-IMMUTABLE).

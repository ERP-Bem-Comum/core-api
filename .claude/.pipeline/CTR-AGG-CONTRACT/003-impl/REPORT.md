# W1 — GREEN — Ticket CTR-AGG-CONTRACT

**Skill:** ts-domain-modeler (modo implementação)
**Data:** 2026-05-14
**Status:** ✅ GREEN — 99/99 testes passando (Money 20 + IDs 24 + Period 25 + Contract 30), `tsc --noEmit` zero erros

---

## Arquivos criados

| Arquivo | Linhas | Conteúdo |
| :--- | ---: | :--- |
| `src/modules/contracts/domain/contract/types.ts` | 38 | `Contract` (branded), `ContractStatus`, `ContractAdjustment` (DU), `CreateContractInput` |
| `src/modules/contracts/domain/contract/events.ts` | 17 | `ContractEvent` (DU 3 variantes) |
| `src/modules/contracts/domain/contract/errors.ts` | 13 | `ContractError` (string literal union, 12 codes) |
| `src/modules/contracts/domain/contract/contract.ts` | 202 | 4 funções de domínio + helpers privados |
| **Total** | **270** | |

> `index.ts` propositalmente não criado nesta wave — TS 6 + `verbatimModuleSyntax: true` reclama de duplicate identifier quando re-exporta `Contract` como type e value de arquivos distintos. O teste importa direto dos arquivos. Quando os adapters precisarem de import unificado, recriaremos com cuidado (provavelmente via inline-type syntax ou consolidando type+value no mesmo arquivo).

---

## Adesão às decisões D1–D11

| # | Decisão | Aplicada? |
| :-- | :--- | :--- |
| D1 | `Contract = Brand<Readonly<{...}>, 'Contract'>` | ✅ `types.ts` |
| D2 | Status `'Active' \| 'Expired' \| 'Terminated'` | ✅ `types.ts` |
| D3 | `currentValue`/`currentPeriod` stateful (snapshots) | ✅ campos no `Contract` |
| D4 | `homologatedAmendmentIds: readonly AmendmentId[]` | ✅ campo no `Contract` |
| D5 | Discriminated union local `ContractAdjustment` (4 variantes) | ✅ `types.ts` |
| D6 | Comandos retornam `Result<{ contract, event }, ContractError>` | ✅ via `CommandOutput` type local |
| D7 | `endedAt: Date \| null` | ✅ |
| D8 | `expire` valida `at >= currentPeriod.end` + `kind === 'Fixed'` | ✅ `contract.ts:86-92` |
| D9 | Comandos só funcionam em `Active` (`assertActive`) | ✅ helper privado |
| D10 | `ContractEvent` com `Created \| StateUpdated \| Ended` (kind: 'Expired' \| 'Terminated') | ✅ |
| D11 | `originalValue`/`originalPeriod` `readonly` jamais sobrescritos | ✅ tipos garantem; spreads preservam |

---

## Adesão às regras transversais

- ✅ **Apenas 1 `throw`** em todo o domínio (`grep`): `contract.ts:179` no `default` do exhaustive switch — única exceção justificada.
- ✅ Zero `class`, `this`, `extends`.
- ✅ Zero `any`. **Necessário `as unknown as ContractEntity`** nos retornos de smart constructor — TS 6 + `verbatimModuleSyntax` exige dupla coerção para Brand quando tipo é importado de arquivo separado. Cast só após validação ou em transição de estado controlada.
- ✅ `Readonly<>` em todo o shape do agregado + `readonly T[]` em `homologatedAmendmentIds`.
- ✅ Erros como string literal union (`ContractError`, 12 códigos kebab-case EN).
- ✅ Toda função exportada tem return type explícito.
- ✅ `import type` em imports puramente de tipo (`Contract as ContractEntity`, `ContractAdjustment`, etc.).
- ✅ Imports terminam em `.ts`.
- ✅ Identificadores em EN.

---

## Padrões emergentes (primeiro agregado real)

### 1. **Alias no import para resolver conflito type vs. value homônimos**

```ts
import type { Contract as ContractEntity, ... } from './types.ts';
// ... uso interno via ContractEntity
export const Contract = { create, expire, terminate, applyHomologatedAdjustment };
```

Quando o type vive em `types.ts` e a const-namespace vive em `contract.ts`, TS 6 + `verbatimModuleSyntax` reclama de merging conflict no mesmo arquivo. Alias resolve. **Padrão a documentar na skill `ts-domain-modeler`** para futuros agregados.

### 2. **Helpers de guarda compostos**

```ts
const assertActive = (c): Result<ContractEntity, 'contract-not-active'> => ...;
const assertValidEventDate = (d): Result<Date, 'contract-invalid-event-date'> => ...;
```

Usados no topo de cada comando — early returns sem repetição. Subset error é tipado **estritamente** ao caso (não `ContractError` cheio) para narrowing preciso no caller.

### 3. **`stateUpdatedEvent` helper privado**

Evita repetir 5 vezes a construção do mesmo evento em `applyHomologatedAdjustment`. Pequeno mas valioso.

### 4. **`as unknown as ContractEntity` em transições de estado**

```ts
const next = {
  ...contract,
  status: 'Expired',
  endedAt: at,
} as unknown as ContractEntity;
```

TS 6 com `verbatimModuleSyntax: true` exige `as unknown` antes do cast para branded type quando o tipo é importado de arquivo separado. Casts ficam dentro das funções de transição, **após validação completa de pré-condições**. Mesma garantia semântica que `as ContractEntity` direto teria; só sintaxe mais defensiva.

---

## Verificação de saída

### `pnpm typecheck`
```
> tsc --noEmit
(silencioso — zero erros)
```

### `pnpm test`
```
ℹ tests 99
ℹ suites 29
ℹ pass 99
ℹ fail 0
ℹ duration_ms 217.88925
```

✅ **99/99** — sem regressão dos 69 anteriores, 30 novos do Contract todos verdes.

**Breakdown do Contract:**
- Contract.create — happy path (1/1)
- Contract.create — validation (6/6)
- Contract.expire — happy path (2/2)
- Contract.expire — rejections (5/5)
- Contract.terminate — happy path (2/2)
- Contract.terminate — rejections (3/3)
- Contract.applyHomologatedAdjustment — ValueIncrease (2/2)
- Contract.applyHomologatedAdjustment — ValueDecrease (2/2)
- Contract.applyHomologatedAdjustment — PeriodExtension (3/3)
- Contract.applyHomologatedAdjustment — Acknowledgment (1/1)
- Contract.applyHomologatedAdjustment — common rejections (3/3)

---

## YAGNI compliance

Não foi adicionado:
- `Contract.reactivate(contract)` — voltar de Terminated para Active. Cenário de negócio raro; abrir ticket se P.O. pedir.
- `Contract.amendOriginalValue(...)` — quebraria R5 (`originalValue` imutável).
- Validation cruzada (`signedAt` deve ser <= `originalPeriod.start`) — não está nos critérios; pode adicionar se P.O. validar regra.
- `Contract.equals(a, b)` — comparação por `id` é trivial; quem precisar usa `a.id === b.id`.
- `Contract.timeline()` — projeção futura, fora do escopo.

---

## Próximo passo

W2 — `code-reviewer` audita os 4 arquivos novos. Atenção especial:
- Casts `as unknown as ContractEntity` (novo padrão; justificar).
- 1 `throw` no exhaustive switch (`contract.ts:179`).
- Discriminated union `ContractAdjustment` com 4 variantes — exhaustive switch obrigatório.

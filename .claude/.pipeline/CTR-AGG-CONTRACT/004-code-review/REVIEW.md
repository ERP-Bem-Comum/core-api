# Code Review — Ticket CTR-AGG-CONTRACT — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer
**Data:** 2026-05-14
**Escopo revisado:**
- `src/modules/contracts/domain/contract/types.ts` (38 linhas)
- `src/modules/contracts/domain/contract/events.ts` (17 linhas)
- `src/modules/contracts/domain/contract/errors.ts` (13 linhas)
- `src/modules/contracts/domain/contract/contract.ts` (202 linhas)
- `tests/modules/contracts/domain/contract/contract.test.ts` (361 linhas) — coerência

---

## Resumo executivo

Primeiro agregado real do módulo. Implementação coesa, **state machine bem expressa** via guards (`assertActive`), discriminated union `ContractAdjustment` com exhaustive switch, eventos retornados pareados com novo estado (padrão `{ contract, event }` event-sourcing-friendly). **Aprovado para W3**.

Issues observadas: **zero bloqueantes**. 3 notas 🔵 documentando padrões emergentes do primeiro agregado.

---

## Checklist aplicado

### A. Regras absolutas do domínio

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Zero `throw` (exceto exhaustive switch) | ✅ | `grep` → 2 `throw`s no domínio inteiro, ambos em `default` com `_exhaustive: never` (`period.ts:40`, `contract.ts:200`) |
| Zero `class` | ✅ | confirmado |
| Zero `this` | ✅ | confirmado |
| Zero `any` | ✅ | confirmado |
| `Readonly<>` em entity | ✅ | `Contract = Brand<Readonly<{...}>, 'Contract'>` em `types.ts:23` |
| `readonly T[]` em arrays | ✅ | `homologatedAmendmentIds: readonly AmendmentId[]` em `types.ts:18` |
| Toda função exportada tem return type | ✅ | todas em `contract.ts` |

### B. Smart constructors e Branded types

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Smart constructor retorna `Result<...>` | ✅ | `create`, `expire`, `terminate`, `applyHomologatedAdjustment` — todas |
| `as ContractEntity` apenas após validação | ✅ | Cada cast é precedido por `assertActive` + `assertValidEventDate` ou validações de input |
| `as unknown as` justificado (Brand homônimo) | ⚠️ Nota 1 | 7 ocorrências de `as unknown as ContractEntity`. Necessárias por TS 6 + `verbatimModuleSyntax` com type importado de arquivo separado. |
| Erro é string literal union | ✅ | `ContractError` (12 códigos) em `errors.ts` |

### C. Discriminated unions e exhaustiveness

| Item | Status | Evidência |
| :--- | :---: | :--- |
| `ContractAdjustment` 4 variantes com `kind` literal | ✅ | `types.ts:25-30` |
| `ContractEvent` 3 variantes com `type` literal | ✅ | `events.ts` |
| Switch com `default: { const _: never = x; throw ... }` | ✅ | `contract.ts:197-201` |
| Cada `case` retorna explicitamente | ✅ | sem fallthrough |
| Sem optional fields entre variantes | ✅ | `Acknowledgment` não tem `amount`/`newEnd`; `PeriodExtension` não tem `amount`; etc. — payload variante-dependente |

### D. Ports & Adapters

N/A — domínio puro.

### E. Modular Monolith

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Domain só importa de `shared/` + próprio módulo | ✅ | `contract.ts` importa `../shared/money.ts`, `../shared/period.ts`, `../shared/ids.ts` (vizinhos no mesmo módulo); `../../../../shared/result.ts` (cross-cutting OK) |

### F. ESM / NodeNext / TypeScript moderno

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Imports `.ts` | ✅ | todos |
| `import type` em imports puramente de tipo | ✅ | `types.ts`, `events.ts`, `errors.ts` ao serem importados |
| Sem `require`/`enum`/`namespace` | ✅ | confirmado |
| `tsc --noEmit` zero erros | ✅ | rodado em W1 |

### G. Naming, EN/PT

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Identificadores em EN | ✅ | `Contract`, `Active`, `Expired`, `Terminated`, `ValueIncrease`, `Acknowledgment`, `create`, `expire`, `terminate`, `applyHomologatedAdjustment` |
| Erros string literal EN kebab-case | ✅ | `'contract-not-active'`, `'contract-amendment-already-applied'`, etc. |

### H. Tests (coerência)

| Item | Status | Evidência |
| :--- | :---: | :--- |
| AAA explícito | ✅ | builders fazem Arrange, cada `it` segue padrão |
| Fixtures factory-style | ✅ | `validInput(overrides)`, `createActive()`, `money()`, `fixedPeriod()`, `indefinitePeriod()` |
| Cobertura proporcional | ✅ | 30 testes para 4 funções + 4 variantes de adjustment + 12 caminhos de erro |
| Sem matchers vagos | ✅ | `assert.equal` exato com valores numéricos / strings literais |
| Cobertura de state machine | ✅ | Active→Expired, Active→Terminated, Active+Adjustment, todas as transições proibidas testadas |

---

## Pontos positivos (explícitos)

1. **State machine via guards** — `assertActive` é o **único** controle de entrada. Cada comando começa com:
   ```ts
   const activeCheck = assertActive(contract);
   if (!activeCheck.ok) return activeCheck;
   ```
   Padrão limpo, sem `switch` complexo em cada função. Tipo de retorno do guard é estreito (`'contract-not-active'`), permitindo TS estreitar erro no caller.

2. **`{ contract, event }` pareados no Result** — cada comando devolve o novo estado **e** o evento que o produziu. Caller (use case) decide se publica via outbox. Padrão event-sourcing-friendly **sem ser puramente event-sourced**.

3. **`ContractAdjustment` como linguagem do Contract** — o agregado **não conhece** `Amendment`. Caller traduz `Amendment.kind` para `ContractAdjustment.kind`. Isso desacopla os dois agregados antecipadamente — quando criarmos `Amendment` no próximo ticket, o `Contract` não precisa mudar.

4. **`homologatedAmendmentIds` é o registro de idempotência** — `includes(adjustment.amendmentId)` rejeita dupla aplicação. Simple, eficaz, audit-friendly.

5. **`stateUpdatedEvent` helper privado** — DRY interno sem expor primitiva à API pública.

6. **`as unknown as ContractEntity` é defensivo, não preguiçoso** — cada cast vem após **todos** os early-returns. Estado intermediário (`{...contract, status: 'Expired', endedAt: at}`) é apenas a transição final. Política coerente com `ts-branded-types.md`.

7. **Erros com prefixo `contract-`** — todos os 12 códigos de erro começam com `contract-`. Padrão consistente, fácil de filtrar/identificar em logs.

8. **PeriodExtension delega validação ao `Period.create`** — em vez de duplicar a regra "newEnd > start", chama o smart constructor existente. Reuso elegante.

---

## Notas (🔵 não-bloqueantes)

### Nota 1 — 7 usos de `as unknown as ContractEntity`

```ts
// contract.ts:67 (create), 99 (expire), 122 (terminate), 154, 164, 180, 188 (applyHomologatedAdjustment)
const next = { ...contract, status: 'Expired', endedAt: at } as unknown as ContractEntity;
```

**Causa:** TS 6 + `verbatimModuleSyntax: true` rejeita cast direto `as ContractEntity` quando o tipo é importado de arquivo separado (`./types.ts`) e o Brand tag (`[brand]` symbol) não está na shape construída.

**Mitigação:** Cada cast vem **após validação completa**. Em runtime, a única forma de produzir um `ContractEntity` válido é pelos comandos deste arquivo. Garantia equivalente ao cast direto que funcionou em `money.ts`/`ids.ts`/`period.ts` (onde type+namespace coexistem no mesmo arquivo).

**Padrão emergente:** Atualizar `ts-domain-modeler/SKILL.md` documentando que **agregados com `types.ts` separado** precisam de `as unknown as` (não problema, só convenção a registrar).

### Nota 2 — `applyHomologatedAdjustment` tem 4 branches grandes

A função tem ~70 linhas (`contract.ts:128-200`). É a maior função do agregado — todas as 4 variantes de `ContractAdjustment` lidam com shape diferente.

**Alternativas consideradas:**
- A (atual): switch único com cada case implementando.
- B: extrair função por variante (`applyValueIncrease`, `applyValueDecrease`, etc.).

Opção A vence: cada case é curto (10-15 linhas), o switch exibe **toda a lógica de transição em uma página**, exhaustive check é local. Extrair funções espalharia o entendimento da máquina de estados. **Mantém.**

### Nota 3 — `ContractEvent.ContractStateUpdated` carrega só `amendmentId`, não o `kind` do adjustment

```ts
{ type: 'ContractStateUpdated'; contractId; occurredAt; amendmentId }
```

Não há registro **no evento** de qual tipo de adjustment (ValueIncrease, etc.) gerou a transição. Para reconstruir o histórico em detalhe, consumidor precisa cruzar `amendmentId` com o aggregate `Amendment` (outro repository).

**Trade-off:**
- A (atual): evento enxuto, info detalhada vive no aggregate Amendment.
- B: payload denormalizado (`{ ...; kind: 'ValueIncrease'; amount: Money }`).

A é coerente com regra do projeto **"módulo X não conhece detalhe interno de Y; cross-módulo via eventos com payload mínimo"**. Quem precisar do detalhe lê o Amendment correspondente.

**Sem ação.** Se virmos demanda real por payload denormalizado, abrir ticket explícito.

### Nota 4 — `index.ts` não criado

`src/modules/contracts/domain/contract/index.ts` foi tentado e removido durante W1 (TS rejeitou duplicate identifier ao re-exportar `Contract` type+value de fontes distintas).

**Status atual:** consumidores importam direto dos arquivos. Funciona para Fase 1.

**Plano:** Quando precisarmos do barrel (provavelmente no `application/use-cases/...`), recriar com inline-type syntax:
```ts
export { type Contract, ... } from './types.ts';  // só types
export { Contract } from './contract.ts';         // só value
```
TS 6 pode aceitar essa forma. Ou consolidar type+value no mesmo arquivo (padrão do `Money`).

---

## O que ficou particularmente bom

- **Translation layer entre handbook PT-BR e código EN documentada** — `000-request.md` tem tabela explícita "Vigente → Active, Encerrado → Expired, Distratado → Terminated". Padrão a replicar em todo ticket que toca conceitos do handbook.
- **Helpers locais privados (`assertActive`, `assertValidEventDate`, `stateUpdatedEvent`)** — convenção: prefixo `assert*` para guards retornando Result. Documentar.
- **Testes usam `if (r.value.event.type === 'ContractCreated')` para narrowing** — caller é forçado a discriminar antes de acessar campos específicos. Tipos protegem o caller.

---

## Próximo passo

W3 — `ts-quality-checker` roda checks finais. Esperado: ALL GREEN com 99 testes (Money 20 + IDs 24 + Period 25 + Contract 30).

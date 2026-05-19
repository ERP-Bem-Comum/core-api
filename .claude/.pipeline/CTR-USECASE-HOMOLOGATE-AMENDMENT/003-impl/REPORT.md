# W1 — GREEN — Ticket CTR-USECASE-HOMOLOGATE-AMENDMENT

**Skill:** ports-and-adapters (primeiro use case real)
**Data:** 2026-05-14
**Status:** ✅ GREEN — 147/147 testes passando (127 anteriores + 20 novos), `tsc --noEmit` zero erros

---

## Arquivos criados

### Ports (4)
| Arquivo | Linhas | Conteúdo |
| :--- | ---: | :--- |
| `src/shared/ports/clock.ts` | 3 | `Clock` port cross-cutting |
| `src/modules/contracts/application/ports/contract-repository.ts` | 14 | `ContractRepository`, `ContractRepositoryError` |
| `src/modules/contracts/application/ports/amendment-repository.ts` | 14 | `AmendmentRepository`, `AmendmentRepositoryError` |
| `src/modules/contracts/application/ports/event-bus.ts` | 11 | `EventBus`, `ContractsModuleEvent` (union do módulo), `EventBusError` |

### Adapters InMemory (5)
| Arquivo | Linhas | Conteúdo |
| :--- | ---: | :--- |
| `src/shared/adapters/clock-real.ts` | 5 | `ClockReal` usando `new Date()` |
| `src/shared/adapters/clock-fixed.ts` | 5 | `ClockFixed(at)` determinístico |
| `src/modules/contracts/adapters/contract-repository.in-memory.ts` | 26 | Handle com `repo` + `store()` + `clear()` |
| `src/modules/contracts/adapters/amendment-repository.in-memory.ts` | 26 | Handle com `repo` + `store()` + `clear()` |
| `src/modules/contracts/adapters/event-bus.in-memory.ts` | 27 | Handle com `bus` + `published()` + `clear()` |

### Use case
| Arquivo | Linhas | Conteúdo |
| :--- | ---: | :--- |
| `src/modules/contracts/application/use-cases/homologate-amendment.ts` | 95 | Factory function que orquestra 8 passos |

**Total novo: 226 linhas em 10 arquivos.**

---

## Use case — fluxo de 8 passos

```ts
const useCase = homologateAmendment(deps);
const r = await useCase(cmd);
```

Sequência (em `homologate-amendment.ts:67`):

```
1. AmendmentId.rehydrate(cmd.amendmentId)       ← validação input
2. ContractId.rehydrate(cmd.contractId)
3. UserRef.rehydrate(cmd.homologatedBy)

4. amendmentRepo.findById(amendmentId)          ← carregar agregados
5. contractRepo.findById(contractId)

6. amendment.contractId === contract.id?         ← validação cruzada
   sim: continua | não: Err('amendment-contract-mismatch')

7. Amendment.homologate(amendment, userRef, now)  ← domínio
8. Amendment.toContractAdjustment(homologated)   ← tradução
9. Contract.applyHomologatedAdjustment(contract, adjustment, now)

10. amendmentRepo.save(homologated)              ← persistência
11. contractRepo.save(updatedContract)

12. eventBus.publish(homologatedEvent)           ← eventos
13. eventBus.publish(stateUpdatedEvent)

14. return ok({ contract, amendment, events })
```

Early return em qualquer falha — nenhum side effect a partir desse ponto.

---

## Adesão às decisões D1–D11

| # | Decisão | Aplicada? |
| :-- | :--- | :--- |
| D1 | Factory `(deps) => (cmd) => Promise<Result>` | ✅ `homologate-amendment.ts:64` |
| D2 | `Deps` `Readonly<{contractRepo, amendmentRepo, eventBus, clock}>` | ✅ linha 59 |
| D3 | `HomologateAmendmentCommand` recebe IDs raw (string) | ✅ linha 36 |
| D4 | `HomologateAmendmentError` union grande (todos os erros) | ✅ linha 41-54 — 12 categorias |
| D5 | `EventBus.publish(ContractsModuleEvent)` | ✅ `event-bus.ts` define union |
| D6 | Save Amendment primeiro, depois Contract | ✅ linhas 92-96 |
| D7 | Eventos publicados depois dos saves | ✅ linhas 99-105 |
| D8 | `Clock` em `src/shared/ports/` | ✅ |
| D9 | InMemory adapters retornam handles com helpers | ✅ todos 3 adapters |
| D10 | Validação `amendment.contractId === contract.id` | ✅ linhas 79-81 |
| D11 | Publish falha → retorna erro mas saves já aconteceram (gap atômico documentado) | ✅ ordem garante "Amendment Homologated sem Contract atualizado" não acontece |

---

## Adesão às regras transversais

- ✅ Zero `throw` em `application/` e `adapters/`.
- ✅ Zero `class`, `this`, `extends`.
- ✅ Zero `any`. Cast em teste (`as unknown as string` para passar `ContractId` branded como string raw — correto pois o use case re-valida).
- ✅ `Readonly<>` em `Deps`, `Command`, `Output`.
- ✅ Toda função exportada com return type explícito.
- ✅ `Result` everywhere — zero exception propagation.
- ✅ `import type` em type-only imports.
- ✅ Imports terminam em `.ts`.
- ✅ Identificadores EN.

---

## Padrões emergentes (primeiro use case)

### 1. **Validação inline em sequência**

Em vez de `combine([rehydrate1, rehydrate2, rehydrate3])`, validações sequenciais com early return:

```ts
const aId = AmendmentId.rehydrate(cmd.amendmentId);
if (!aId.ok) return aId;
const cId = ContractId.rehydrate(cmd.contractId);
if (!cId.ok) return cId;
const userRef = UserRef.rehydrate(cmd.homologatedBy);
if (!userRef.ok) return userRef;
```

Trade-off: 6 linhas em vez de 4. **Ganho:** primeiro erro retorna sem fazer o segundo lookup — performance + tipo de erro mais específico (não tuple-of-results). Aceitável.

### 2. **Handle factory pattern para InMemory adapters**

```ts
type InMemoryFooHandle = Readonly<{
  repo: FooRepository;       // implementa o port
  store: () => readonly Foo[]; // helper de inspeção
  clear: () => void;            // helper de teste
}>;
```

Permite test/CLI inspecionar estado sem violar o `Port` puro. Pattern replicável.

### 3. **Union do módulo: `ContractsModuleEvent`**

`type ContractsModuleEvent = ContractEvent | AmendmentEvent` no `event-bus.ts`. Permite EventBus type-safe **só dentro do módulo**. Quando outro módulo precisar publicar, ou cria sua própria union, ou subimos para um EventBus genérico (`EventBus<E>`).

### 4. **Mismatch check antes de homologação**

Validar `amendment.contractId === contract.id` **antes** de tentar homologar. Falha rápido — não chama domínio com dados inconsistentes.

### 5. **Cast `as unknown as string` em teste de branded type**

```ts
const r = await useCase({
  amendmentId: world.amendment.id as unknown as string,
  ...
});
```

Use case aceita `string` raw e re-valida. Teste passa o ID branded **forçando o downcast** para string — em produção, vem direto do JSON. Padrão aceitável em testes.

---

## Verificação de saída

### `pnpm typecheck`
```
> tsc --noEmit
(silencioso — zero erros)
```

### `pnpm test`
```
ℹ tests 147
ℹ suites 49
ℹ pass 147
ℹ fail 0
ℹ duration_ms 260.421833
```

✅ **147/147** — sem regressão dos 127 anteriores, 20 novos verdes.

**Breakdown dos novos:**
- happy path (3/3)
- input validation (3/3)
- not found (2/2)
- mismatch (1/1)
- domain rule propagation (3/3)
- side effects on error (2/2)
- InMemoryContractRepository (2/2)
- InMemoryAmendmentRepository (1/1)
- InMemoryEventBus (2/2)
- ClockFixed (1/1)

---

## Gaps conhecidos (não bloqueantes)

| # | Gap | Mitigação Fase 1 | Resolução futura |
| :-- | :--- | :--- | :--- |
| G1 | Saves não-atômicos (Amendment salva, Contract pode falhar) | Aceitar — InMemory não tem transação | Adapter MySQL real exigirá transação ou outbox saga |
| G2 | Publish entre 2 saves não-atômico — se primeiro publish OK e segundo falha, evento órfão | Aceitar — log retorna erro | Outbox real garante replay |
| G3 | Use case não tem retry/idempotência explícita — chamadas duplicadas após erro produzem comportamento inconsistente | Aceitar — Amendment Homologated salvo bloqueia segunda chamada via `amendment-not-pending` | OK para Fase 1 |

---

## Próximo passo

W2 — `code-reviewer` audita. Atenção:
- **Primeiro use case** — define padrão para próximos.
- **Ordering decisions** (save amendment first, publish after both saves).
- **Cast `as unknown as string`** em teste — aceitável ou code smell?
- **3 erros de gap** documentados — adequados para Fase 1?

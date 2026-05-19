# Ticket CTR-USECASE-HOMOLOGATE-AMENDMENT: Use case `homologateAmendment`

> **Idioma:** documentação em PT. Identificadores em EN (regra invariante).

## Contexto

Os agregados `Contract` e `Amendment` estão prontos e testados. Falta a **camada que orquestra os dois**: o use case `homologateAmendment` realiza o fluxo completo de homologação descrito no handbook.

Sequência de eventos:

```
1. Operador chama o use case com (amendmentId, contractId, homologatedBy)
2. Use case carrega Amendment via repo
3. Use case carrega Contract via repo
4. Use case valida que amendment.contractId === contract.id
5. Amendment.homologate(amendment, userRef, now) → Amendment Homologated + event
6. Amendment.toContractAdjustment(amendment) → ContractAdjustment
7. Contract.applyHomologatedAdjustment(contract, adjustment, now) → Contract atualizado + event
8. Persiste Amendment e Contract via repos
9. Publica os 2 eventos via EventBus (outbox)
10. Retorna { contract, amendment, events }
```

Este ticket **fecha o ciclo end-to-end** do domínio. Depois dele, a CLI da P.O. pode rodar a homologação completa.

## Escopo

### Ports
- `src/shared/ports/clock.ts` — `Clock` (cross-cutting).
- `src/modules/contracts/application/ports/contract-repository.ts` — `ContractRepository`.
- `src/modules/contracts/application/ports/amendment-repository.ts` — `AmendmentRepository`.
- `src/modules/contracts/application/ports/event-bus.ts` — `EventBus` (aceita `ContractEvent | AmendmentEvent`).

### Adapters InMemory
- `src/shared/adapters/clock-real.ts` — usa `new Date()`.
- `src/shared/adapters/clock-fixed.ts` — para tests determinísticos.
- `src/modules/contracts/adapters/contract-repository.in-memory.ts`.
- `src/modules/contracts/adapters/amendment-repository.in-memory.ts`.
- `src/modules/contracts/adapters/event-bus.in-memory.ts`.

### Use case
- `src/modules/contracts/application/use-cases/homologate-amendment.ts`.

### Testes
- `tests/modules/contracts/application/use-cases/homologate-amendment.test.ts`.

## Fora de escopo

- **CLI** — próximo ticket (`CTR-CLI-MVP`).
- **Adapters reais** (MySQL via Drizzle, HTTP) — tickets posteriores.
- **Transação atômica entre repos** — InMemory não tem transação. Decidido aceitar saves não-atômicos em Fase 1 (registrar como gap conhecido — adapter MySQL real precisará de transação ou outbox saga).
- **Validação de "amendment não pertence ao contract"** — sim, no escopo (validação básica).
- **Idempotência do use case** — se chamado 2x com mesmo `amendmentId`, segunda chamada falha por `amendment-not-pending` (já homologado). Aceitável; testes cobrem.

## Decisões de design

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | Use case = factory function `(deps) => (cmd) => Promise<Result<output, error>>` | Padrão do projeto (skill ports-and-adapters). DI explícito, deps `Readonly<>`. |
| D2 | `Deps` agrupa `contractRepo`, `amendmentRepo`, `eventBus`, `clock` | Single param, ordem irrelevante, fácil mock parcial. |
| D3 | `HomologateAmendmentCommand` recebe IDs raw (`string`) | Use case valida e rehydrata internamente — caller (CLI/HTTP) não precisa conhecer branded types. |
| D4 | `HomologateAmendmentError` é union grande de todos os erros possíveis | Cliente sabe **exatamente** o que pode dar errado. Categorias: input invalid, not-found, domain rules, repo, event-bus. |
| D5 | `EventBus.publish(event)` aceita `ContractEvent \| AmendmentEvent` | Union explícita do módulo. Permite type-safe consumo. |
| D6 | Sequência de saves: **Amendment primeiro, depois Contract** | Se Contract.save falha, Amendment fica Homologated sem Contract atualizado. **Gap conhecido** (atomicidade), mas Amendment Homologated sem Contract atualizado é estado detectável e recuperável manualmente. Pior cenário se reverter ordem: Contract atualizado sem Amendment Homologated → caller pode aplicar de novo. Optei pela menos pior. |
| D7 | Eventos publicados **depois** dos saves | Outbox pattern simplificado. Em Fase 1 InMemory, sem garantia atômica. |
| D8 | `Clock` em `src/shared/ports/` (não no módulo) | Cross-cutting genuíno — todo módulo vai usar. Subir já é correto. |
| D9 | InMemory adapters retornam **handles** com `repo` + helpers de inspeção (`store()`, `published()`, `clear()`) | Habilita testes e CLI debug sem violar o `Port` (handle envelopa o port). |
| D10 | Use case **valida `amendment.contractId === contract.id`** | Defesa contra cliente passando contractId errado. Erro próprio: `'amendment-contract-mismatch'`. |
| D11 | Use case **não** mata transação se publish falha após ambos saves OK | Em Fase 1, log + retorna erro. Outbox real garantirá replay. |

## Critérios de aceite

### Happy path
- [ ] Comando válido + agregados encontrados → retorna `Ok({ contract: updated, amendment: homologated, events: [AmendmentHomologated, ContractStateUpdated] })`.
- [ ] Amendment persistido com `status: 'Homologated'`, `homologatedAt`, `homologatedBy`.
- [ ] Contract persistido com `currentValue/currentPeriod` atualizados conforme o `AmendmentKind`.
- [ ] 2 eventos publicados no EventBus na ordem `AmendmentHomologated` → `ContractStateUpdated`.

### Validação de input
- [ ] `amendmentId` UUID inválido → `Err('amendment-id-invalid')`.
- [ ] `contractId` UUID inválido → `Err('contract-id-invalid')`.
- [ ] `homologatedBy` UUID inválido → `Err('user-ref-invalid')`.

### Not found
- [ ] Amendment não existe no repo → `Err('amendment-not-found')`.
- [ ] Contract não existe no repo → `Err('contract-not-found')`.

### Mismatch
- [ ] Amendment existe mas `amendment.contractId !== contract.id` → `Err('amendment-contract-mismatch')`. Nada é persistido.

### Propagação de erros de domínio
- [ ] Amendment já Homologated → `Err('amendment-not-pending')` (propagado de `Amendment.homologate`).
- [ ] Amendment sem signedDocumentRef → `Err('amendment-without-signed-document')`.
- [ ] Contract Expired/Terminated → `Err('contract-not-active')` (propagado de `Contract.applyHomologatedAdjustment`).
- [ ] Em casos de erro de domínio, **nada é persistido** (Amendment não salva, Contract não salva, eventos não publicam).

### Erros do tipo `ValueDecrease` excedente
- [ ] `Suppression` cujo `impactValue` excede `currentValue` → `Err('contract-value-would-go-negative')`. Nada persistido.

### Tipagem
- [ ] `HomologateAmendmentError` é union exhaustive — TS força tratar todos os casos.

### InMemory adapter behaviors
- [ ] `InMemoryContractRepository.findById(id)` → quando não existe, retorna `Ok(null)`, não erro.
- [ ] `InMemoryEventBus.published()` retorna eventos na ordem que foram publicados.
- [ ] `ClockFixed(at)` sempre retorna o mesmo `at` em `now()`.

## Referências

- [`.claude/skills/ports-and-adapters/SKILL.md`](../../skills/ports-and-adapters/SKILL.md) — padrão do use case factory.
- [`handbook/domain/contratos/06-event-line-context.md`](../../../../../handbook/domain/contratos/06-event-line-context.md) — matriz de eventos.
- Tickets anteriores: [CTR-AGG-CONTRACT](../CTR-AGG-CONTRACT/STATE.md), [CTR-AGG-AMENDMENT](../CTR-AGG-AMENDMENT/STATE.md).

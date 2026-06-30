# Estado CTR-OUTBOX-INTEGRATION-IN-REPOS

> **CLOSED — ALL GREEN.** Ticket #4/7 série Outbox (size L). Pipeline W0→W3 completo.

## Waves

| Wave | Status | Skill | Resultado |
| :--- | :--- | :--- | :--- |
| W0 — RED | ✅ DONE | tdd-strategist | 36 testes RED, 619 passes preservados |
| W1 — GREEN | ✅ DONE | ports-and-adapters | 655/655 passes, typecheck limpo |
| W2 — REVIEW | ✅ APPROVED (Round 2) | code-reviewer | 18 erros lint corrigidos no round 1 |
| W3 — QUALITY | ✅ ALL GREEN | ts-quality-checker | typecheck ✅ format ✅ lint ✅ test 655/655 ✅ |

## Sumário de mudanças

### src/ (produção)

- `domain/contract/repository.ts` — `save(contract, events[])`, `ContractRepositoryError` inclui `OutboxAppendError`
- `domain/amendment/repository.ts` — `save(amendment, events[])`, `AmendmentRepositoryError` inclui `OutboxAppendError`
- `adapters/persistence/repos/outbox-repository.drizzle.ts` — nova função exportada `appendOutboxInTx`
- `adapters/persistence/repos/contract-repository.drizzle.ts` — `persistContractInTx` + `save(c, events)` com `db.transaction` unificado
- `adapters/persistence/repos/amendment-repository.drizzle.ts` — `save(a, events)` com `db.transaction` unificado
- `adapters/contract-repository.in-memory.ts` — recebe `OutboxPort` opcional; `save` appenda eventos
- `adapters/amendment-repository.in-memory.ts` — idem
- `adapters/outbox.in-memory.ts` — `clear()` adicionado
- `application/use-cases/create-contract.ts` — `eventBus` removido de Deps
- `application/use-cases/create-amendment.ts` — idem
- `application/use-cases/attach-signed-document.ts` — idem
- `application/use-cases/homologate-amendment.ts` — idem; 2 saves com eventos separados (CA-10)
- `cli/context.ts` — `eventBus` removido de `CliContext`
- `cli/drivers/memory.ts` — instancia `InMemoryOutbox` e injeta nos repos
- `cli/drivers/mysql.ts` — remove `InMemoryEventBus`; repos Drizzle persistem outbox automaticamente
- `cli/commands/criar-contrato.ts`, `criar-aditivo.ts`, `anexar-documento.ts`, `homologar-aditivo.ts` — remove `eventBus` do deps
- `cli/state.ts` — `save(agg, [])` na restauração de estado

### tests/ (atualizados para nova assinatura)

- 4 use case tests (create-contract, create-amendment, attach-signed-document, homologate-amendment)
- contract-repository.suite.ts, amendment-repository.suite.ts, inmemory.test.ts
- queries.test.ts, drizzle-mysql.test.ts, reports-2026-05-15.test.ts
- contract-repository.shape.test.ts — regex atualizado para `persistContractInTx`

## Gates W3

```
typecheck:    0 erros
format:check: All matched files use Prettier code style!
lint:         0 erros
test:         668 tests | 655 pass | 0 fail | 13 skip
```

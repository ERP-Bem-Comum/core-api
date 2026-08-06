# Contrato interno — Append atômico de evento (024 / #127)

> Não é contrato HTTP (nenhuma rota muda). É o contrato da **fronteira transacional** entre application (use-cases) e persistence (repos) do Financeiro.

## Assinatura das operações de repo (estado + evento na mesma tx)

```
DocumentRepository.save(aggregate, timelineEntries, events, expectedVersion?)
ReconciliationRepository.confirm(reconciliation, transactionId, events)
ReconciliationRepository.confirmManualEntry(entry, events)
ReconciliationRepository.undo(reconciliationId, events)
```

Cada operação abre **uma** `db.transaction` que persiste o estado **e** chama `appendFinOutboxInTx(tx, events)` (INSERT em `fin_outbox`) — antes do COMMIT.

## Garantias (testáveis)

| Cenário                                       | Resultado                                                                                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operação com sucesso (estado + N eventos)     | estado e eventos duráveis; `COUNT(fin_outbox)` += N (SC-001)                                                                                                            |
| Operação sem eventos (`events = []`)          | estado persiste; nada no outbox (edge case)                                                                                                                             |
| **Falha no INSERT do outbox** (CHECK/PK/erro) | **tx inteira reverte** — estado não persiste, nenhum evento; `COUNT(agregado)` e `COUNT(fin_outbox)` == baseline; retorna slug `*-repository-failure` (CA2/CA3, SC-002) |
| Falha na persistência do estado               | idem — reverte; nenhum evento órfão                                                                                                                                     |
| Reexecução com mesmo `event_id`               | PK rejeita (`ER_DUP_ENTRY`) → tx reverte → sem duplicata (idempotência, FR-006)                                                                                         |

## Erros

- Falha de persistência (estado ou outbox) → slug interno de erro do repo (`document-repository-failure` / `reconciliation-repository-*`); **nunca** vaza `Error`/exceção (FR-004, `.claude/rules/adapters.md`).

## Invariantes

- Evento durável **se e somente se** estado persistido (ADR-0015) — a propriedade central.
- Caminho de sucesso das operações **inalterado** para os chamadores HTTP (FR-007).
- Sem `outbox.append` separado nos use-cases (absorvido pela operação do repo).

## Cobertura (anti-regressão)

Teste de **integração** (drizzle-mysql, Docker) que **injeta falha** entre estado e outbox e confirma o rollback total (`COUNT == baseline`) — para documento E conciliação. É o teste que falha se a atomicidade regredir (SC-005).

# W0 — Testes RED (PAR-SUPPLIER-EVENTS)

**Disciplina**: tdd-strategist (via agente) · **Resultado**: 🔴 RED.

## Arquivos

- `tests/modules/partners/adapters/persistence/mappers/supplier-outbox.mapper.test.ts` — mapper: Registered/Edited → OutboxMessage; Deactivated/Reactivated → filtrados (0).
- `tests/modules/partners/application/use-cases/supplier-outbox.test.ts` — register publica `SupplierRegistered`; edit publica `SupplierEdited` (snapshot); via repo in-memory + outbox in-memory.
- Integração (gated `MYSQL_INTEGRATION=1`): save + evento → 1 row em `par_outbox` na mesma tx; rollback → 0 rows.

## RED

- Mapper unit: `ERR_MODULE_NOT_FOUND` (mapper inexistente).
- Use case: 4 testes, **2 fail** (register/edit esperavam 1 publicação, obtiveram 0 — `save` ainda não publicava); os 2 de filtro (deactivate/reactivate → 0) já passavam (contrato de não-publicação).

Viram GREEN no W1 (port `save(supplier, events)` + mapper + tx + use cases).

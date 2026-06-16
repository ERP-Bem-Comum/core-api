# W1 — Implementação mínima (PAR-SUPPLIER-EVENTS)

**Resultado**: 🟢 GREEN (verificado independentemente).

## Mudanças

- `domain/supplier/repository.ts` — `save(supplier, events: readonly SupplierEvent[])`.
- **Novo** `adapters/persistence/mappers/supplier-outbox.mapper.ts` — `supplierEventsToOutboxMessages(events, supplier)`: filtra `SupplierRegistered`/`SupplierEdited`; payload `{supplierRef: String(id), name, document: String(cnpj), occurredAt: ISO}`; `eventId`=UUID v4; `aggregateType='Supplier'`.
- `adapters/persistence/repos/supplier-repository.drizzle.ts` — `save` reescrito para `db.transaction`: persist do supplier + `appendOutboxInTx(tx, schema, messages)` na MESMA tx (atomicidade ADR-0015).
- `adapters/persistence/repos/supplier-repository.in-memory.ts` — `makeInMemorySupplierStore(outbox?)` injetável (espelha o padrão `timelineStore` do financial); publica via mapper no outbox in-memory.
- 4 use cases (register/edit/deactivate/reactivate) — passam `[event]` ao `save` (o filtro de publicáveis vive no mapper).
- **Novo** `handbook/architecture/adr/0043-partners-supplier-integration-events.md` — contrato de evento `partners → financial` + CHANGELOG/README.

## Execução (verificada por mim)

```
pnpm run typecheck                                          → verde
node --test mapper.test.ts + use-cases/supplier-outbox.test → 10/10
suíte partners completa (agente)                           → 553/553
```

Callers do `save` atualizados (assinatura): 4 use cases de produção + 3 testes existentes (`save(s, [])`). Sem caller cross-módulo. Decisões respeitadas: Opção A (payload no adapter), só Registered/Edited, snapshot em toda edição.

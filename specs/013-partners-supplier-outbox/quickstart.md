# Phase 1 — Quickstart: Partners outbox de fornecedor

Tudo via `pnpm` (nunca `npm` — ADR-0012).

## Gate de qualidade (W3)

```bash
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

## Migration (par_outbox)

```bash
# após editar adapters/persistence/schemas/mysql.ts (par_outbox + par_outbox_dead_letter)
pnpm run db:generate:partners      # → migrations/mysql/0009_*.sql
# auditar o SQL; aplicar via integração
```

## Suítes

```bash
# unit/contrato (InMemory) — outbox append + worker ops + eventos do supplier
pnpm test -- --test-name-pattern="outbox|supplier"
# integração MySQL (append na tx real, worker FOR UPDATE SKIP LOCKED, CHECK)
pnpm run test:integration:partners
```

## Worker (publicação)

```bash
# processo standalone (espelha worker:outbox do contracts)
PARTNERS_DATABASE_URL=mysql://... pnpm run worker:outbox:partners
```

## Verificação manual

1. Cadastrar um fornecedor (use case/HTTP de partners) → conferir 1 row em `par_outbox` com `event_type='SupplierRegistered'` e `payload` contendo `supplierRef`/`name`/`document`.
2. Editar o fornecedor (qualquer campo) → 1 row `SupplierEdited` com snapshot pós-edição.
3. Rodar o worker → as rows ficam com `processed_at` preenchido; reprocessar não duplica efeito.
4. Forçar falha de entrega repetida → após `maxAttempts`, evento vai para `par_outbox_dead_letter`.

## Definition of Done

- W0 RED → W1 GREEN; W2 com citação (§IX — ADR-0015/Vernon); W3 verde + `pnpm run test:integration:partners`.
- Append atômico (rollback some o evento); contrato de evento registrado em ADR/handbook.
- **Não** tocar `financial` (consumer/read-model = US2 da #47).

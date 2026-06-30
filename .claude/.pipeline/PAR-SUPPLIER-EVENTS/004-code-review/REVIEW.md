# W2 — Code Review (PAR-SUPPLIER-EVENTS)

**Veredito:** ✅ APPROVED · **Revisor:** drizzle-orm-expert (read-only) · **Round:** 1/3
**Blocker:** 0 · **Major:** 0 · **Minor:** 2 (ambos endereçados)

## Escopo revisado

Publicação de eventos de fornecedor via outbox (`par_outbox`), produtor-only:

- `domain/supplier/repository.ts` — `save(supplier, events: readonly SupplierEvent[])`.
- `adapters/persistence/mappers/supplier-outbox.mapper.ts` (novo) — filtro + payload de integração.
- `adapters/persistence/repos/supplier-repository.drizzle.ts` — `save` em `db.transaction`.
- `adapters/persistence/repos/supplier-repository.in-memory.ts` — outbox injetável.
- 4 use cases (`register`/`edit`/`deactivate`/`reactivate`) passam `[event]` ao `save`.
- `handbook/architecture/adr/0043-*` + CHANGELOG + README.

## Conformidade canônica

- **Atomicidade (ADR-0015).** O adapter Drizzle abre **uma** transação que persiste o
  supplier e faz `appendOutboxInTx(tx, schema, messages)` na MESMA tx
  (`supplier-repository.drizzle.ts:127-145`), com rollback total no `catch`
  (`:147-151`). Cumpre ADR-0015 (`0015-mysql-outbox-pattern.md:51`):
  > "COMMITAR TRANSAÇÃO   <- evento existe SE E SOMENTE SE estado persistido"
  e ADR-0043 (`0043-partners-supplier-integration-events.md:64`):
  > "abre **uma transação** que persiste o supplier **e** faz `appendOutboxInTx` na MESMA tx — rollback total se qualquer passo falhar".

- **Evento de domínio ≠ evento de integração (ADR-0006 / Vernon).** O payload
  (`name`/`document`) é enriquecido no adapter a partir do snapshot do agregado
  (Opção A — domínio intocado), conforme `0043-*:19`:
  > "É a distinção clássica entre **evento de domínio** (interno ao BC) e **evento de integração** (contrato cross-fronteira) — Vernon, _Implementing DDD_, cap. 'Domain Events'."

- **Payload sem JSON nativo (ADR-0020).** `JSON.stringify` em `varchar`
  (`supplier-outbox.mapper.ts:67`), alinhado a `0043-*:40`.

- **Filtro do contrato (ADR-0043).** Só `SupplierRegistered`/`SupplierEdited` viram
  mensagem (`supplier-outbox.mapper.ts:22-25`); `Deactivated`/`Reactivated` descartados —
  bate com a tabela de `0043-*:29-34`.

## Minors (endereçados)

1. **Docstring do InMemory não explicitava a divergência de atomicidade.** O fake grava
   o agregado e só então publica (sem rollback), enquanto o Drizzle envolve ambos na
   mesma tx. → **Aplicado:** docstring de `supplier-repository.in-memory.ts:8-15`
   documenta a divergência deliberada e remete o invariante real à suíte de integração MySQL.

2. **Faltava cobrir edição de CNPJ no payload.** O teste de `SupplierEdited` só exercitava
   mudança de `name`. → **Aplicado:** novo caso em
   `tests/.../use-cases/supplier-outbox.test.ts` com `canEditSensitive: true` +
   CNPJ `11.444.777/0001-61` → `payload.document === '11444777000161'`.

## Verificação

```
pnpm run typecheck                                    → verde
node --test mapper.test.ts + supplier-outbox.test.ts → 11/11 (10 + caso do Minor 2)
```

Sem import cross-módulo de `domain/`/`application/` alheio (ADR-0006). Só toca `partners`.

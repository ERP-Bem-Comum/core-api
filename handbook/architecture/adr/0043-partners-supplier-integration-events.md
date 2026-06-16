[← Voltar para ADRs](./README.md)

# ADR-0043: Contrato de eventos de integração `partners → financial` (Supplier cadastrado/atualizado)

- **Status:** Accepted
- **Date:** 2026-06-16
- **Deciders:** Gabriel (tech lead / arquiteto).
- **Origem:** Feature [`013-partners-supplier-outbox`](../../../specs/013-partners-supplier-outbox/) · issue [#92](https://github.com/ERP-Bem-Comum/core-api/issues/92) — pré-requisito da **US2** da [#47](https://github.com/ERP-Bem-Comum/core-api/issues/47) (read-model de fornecedor no `financial`). O ticket `PAR-OUTBOX-INFRA` entregou a infra de outbox (`par_outbox`); este ADR fixa o **contrato dos eventos** que o `partners` publica.
- **Estende:** [ADR-0015](./0015-mysql-outbox-pattern.md) (outbox pattern, at-least-once, atomicidade) · [ADR-0006](./0006-modular-monolith-core-api.md) (modular monolith — comunicação cross-módulo por eventos, nunca leitura cruzada de tabelas) · [ADR-0014](./0014-mysql-database-isolation.md) (prefixo `par_*`) · [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (payload `varchar` via `JSON.stringify`, sem JSON nativo).

---

## Contexto

O módulo `partners` emite eventos de domínio do agregado `Supplier` (`SupplierRegistered`, `SupplierEdited`, `SupplierDeactivated`, `SupplierReactivated`), mas até aqui eles **não eram publicados** cross-módulo — nenhum outro módulo conseguia reagir a cadastros/edições de fornecedor.

A US2 da #47 precisa que o `financial` mantenha um **read-model local de fornecedor** (`fin_supplier_view`: `supplierRef → name, document`) sem consultar o `partners` em runtime (ADR-0006). Para isso, o `partners` precisa **publicar** eventos autocontidos via outbox.

Os eventos de **domínio** atuais não carregam `name` (`SupplierRegistered` só tem `cnpj`; `SupplierEdited` não carrega campos). O contrato de **integração** exige `name` + `document`. É a distinção clássica entre **evento de domínio** (interno ao BC) e **evento de integração** (contrato cross-fronteira) — Vernon, _Implementing DDD_, cap. "Domain Events".

---

## Decisão

Fixar o contrato de integração `partners → financial` abaixo. O `partners` publica **somente** `SupplierRegistered` e `SupplierEdited` (decisão do clarify — o read-model é nome/CNPJ; status de ativação não muda esses campos).

### Eventos publicados

| `event_type`         | Quando                                                   | Publica? |
| -------------------- | -------------------------------------------------------- | :------: |
| `SupplierRegistered` | Fornecedor cadastrado                                    |    ✅    |
| `SupplierEdited`     | **Toda** edição (snapshot pós-edição — qualquer campo)   |    ✅    |
| `SupplierDeactivated`| Desativação                                              |    ❌    |
| `SupplierReactivated`| Reativação                                               |    ❌    |

> `Deactivated`/`Reactivated` ficam **fora do contrato** por ora (não mudam nome/CNPJ). A infra de outbox os comporta no futuro, se um consumidor precisar.

### Payload (wire format, `schema_version = 1`)

Autocontido (FR-006), montado **no adapter de persistência** a partir do **snapshot do agregado** (`supplier-outbox.mapper.ts`), não do evento de domínio (Opção A — não toca o domínio). `JSON.stringify` em `varchar(8192)` (ADR-0020 — sem JSON nativo).

```jsonc
{
  "supplierRef": "uuid", // String(supplier.id)
  "name": "Fornecedor X LTDA", // supplier.name (snapshot)
  "document": "12345678000190", // String(supplier.cnpj) — CNPJ 14 dígitos
  "occurredAt": "2026-06-16T21:00:00.000Z", // event.occurredAt.toISOString()
}
```

Campos da `OutboxMessage` (envelope, em `par_outbox`):

| Campo            | Valor                                                   |
| ---------------- | ------------------------------------------------------- |
| `event_id`       | UUID v4 novo por mensagem (`newUuid`)                   |
| `aggregate_id`   | `String(supplier.id)`                                   |
| `aggregate_type` | `'Supplier'` (CHECK no schema)                          |
| `event_type`     | `'SupplierRegistered'` / `'SupplierEdited'`             |
| `schema_version` | `1`                                                     |
| `occurred_at`    | `event.occurredAt`                                      |

### Garantias

- **Atomicidade:** o evento só existe se a escrita do agregado confirmou. `save(supplier, events)` abre **uma transação** que persiste o supplier **e** faz `appendOutboxInTx` na MESMA tx — rollback total se qualquer passo falhar (ADR-0015).
- **At-least-once:** o worker de outbox entrega com retry + dead-letter; um evento pode ser entregue mais de uma vez.
- **Idempotência:** cada evento tem `event_id` único. O **consumidor** deve aplicar uma única vez (ex.: tabela de eventos processados por `consumer_id` + `event_id`) e fazer **upsert idempotente** do read-model — absorve `SupplierEdited` "redundante" (edição que não tocou nome/CNPJ) sem inconsistência.

---

## Consequências

**Positivas:**

- O `financial` (US2 da #47) consome o contrato sem ler o código nem as tabelas do `partners` (ADR-0006).
- Domínio do `partners` intocado (Opção A): o enriquecimento `name`/`document` vive no adapter, separando evento-de-domínio (interno) de evento-de-integração (contrato).
- Contrato versionado (`schema_version`) — evolução futura sem quebrar consumidores.

**Negativas / trade-offs:**

- `SupplierEdited` publica em toda edição (snapshot completo), mesmo sem mudança de nome/CNPJ — gera eventos "redundantes". Mitigado pelo upsert idempotente no consumidor (mais simples e robusto — YAGNI; decisão do clarify).
- O payload é montado no adapter (não no domínio) — se um segundo consumidor exigir mais campos, reabrir o trade-off Opção A vs Opção B (enriquecer o evento de domínio).

---

## Consumidor previsto

`financial` (US2 da #47, **feature seguinte** — fora do escopo de #92): mantém `fin_supplier_view`, aplicando `SupplierRegistered` (insert) e `SupplierEdited` (upsert). **Não** consulta o `partners` em runtime.

---

## Referências

- [ADR-0015](./0015-mysql-outbox-pattern.md) — Outbox pattern MySQL (atomicidade, at-least-once, idempotência).
- [ADR-0006](./0006-modular-monolith-core-api.md) — Modular monolith; cross-módulo por eventos.
- [ADR-0014](./0014-mysql-database-isolation.md) — isolamento por prefixo (`par_*`).
- [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) — payload `varchar` via `JSON.stringify`.
- [`specs/013-partners-supplier-outbox/contracts/README.md`](../../../specs/013-partners-supplier-outbox/contracts/README.md) — contrato detalhado.
- Vernon, _Implementing Domain-Driven Design_, cap. "Domain Events" (publicação confiável; evento de domínio vs integração).

# FIN-LIST-DTO-LOCAL — request

> Ticket da feature `012-financial-list-dto` (US1, P1). Origem: GitHub issue **#47** (FIN-LIST-DTO) — parte local.

## Problema

O item de `GET /api/v2/financial/documents` não traz `series`, `grossValueCents`, `paymentMethod` e `contractRef` — colunas que já existem em `fin_documents` — forçando o grid de Contas a Pagar a deixá-las vazias.

## Escopo (só US1 — campos locais)

- `DocumentListItem` (read-model) + `findPaged` (SELECT/mapper) + in-memory + `listItemToSummaryDto` + `documentSummarySchema` ganham os 4 campos.
- **NÃO** fazer US2 (fornecedor nome+CNPJ via read-model) — bloqueada (issue #92, partners sem outbox).
- **Sem migration** (colunas já existem). Campos pré-existentes do item inalterados.

## Critérios de aceite

- **CA1**: cada item da listagem traz `series` (nullable), `grossValueCents`, `paymentMethod`, `contractRef` (nullable).
- **CA2**: documento sem série/contrato → `series`/`contractRef` = `null`, sem erro.
- **CA3**: campos pré-existentes (id, status, …, version) inalterados; paginação/filtros inalterados.

## Definition of Done

- W0 RED → W1 GREEN; W2 review; W3 verde + `pnpm run test:integration:financial`.

## Size

**S** — 4 campos locais ao read-model + SELECT + DTO; sem migration.

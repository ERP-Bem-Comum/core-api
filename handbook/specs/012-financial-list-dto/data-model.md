# Phase 1 — Data Model: Financial List DTO (US1)

Apenas US1 (campos locais). Nenhum agregado novo, nenhuma migration (colunas já existem em `fin_documents`). US2 (read-model de fornecedor) fica fora — ver `research.md`.

## Read-model da listagem — `DocumentListItem`

Projeção leve de `fin_documents` (sem tabelas filhas). Campos atuais + 4 adicionados:

| Campo                                                                     | Tipo (domínio)   | Origem (`fin_documents`)         | Status     |
| ------------------------------------------------------------------------- | ---------------- | -------------------------------- | ---------- |
| id, status, documentNumber, type, supplierRef, netValue, dueDate, version | —                | já mapeados                      | inalterado |
| **series**                                                                | `string \| null` | `series` (`varchar(20)`)         | **novo**   |
| **grossValue**                                                            | `Money`          | `gross_value` (`bigint` cents)   | **novo**   |
| **paymentMethod**                                                         | `PaymentMethod`  | `payment_method` (`varchar(24)`) | **novo**   |
| **contractRef**                                                           | `string \| null` | `contract_ref` (`varchar(36)`)   | **novo**   |

## DTO do item — `DocumentSummaryDto`

Saída do `GET /api/v2/financial/documents`. Campos pré-existentes inalterados; adição de 4:

| Campo DTO           | Tipo (response)    | Fonte                                       |
| ------------------- | ------------------ | ------------------------------------------- |
| **series**          | `string \| null`   | `item.series`                               |
| **grossValueCents** | string de centavos | `moneyToCentsString(item.grossValue.cents)` |
| **paymentMethod**   | string             | `item.paymentMethod`                        |
| **contractRef**     | `string \| null`   | `item.contractRef`                          |

## Regras de validação / mapeamento

- `grossValueCents`: string decimal de centavos (mesmo padrão de `netValueCents`).
- `series`/`contractRef`: `null` quando ausentes (documento sem série/contrato) — sem erro (FR-008).
- Os campos pré-existentes (id, status, …, version) **não mudam** de forma nem valor (FR-009).

## Fora de escopo (US2 — bloqueado)

- **Read-model de fornecedor (`fin_supplier_view`)**: tabela `fin_*` denormalizada (`supplier_ref`, `name`, `document`) mantida por eventos do `partners`. Requer migration + consumer + eventos publicados pelo `partners` (inexistentes). Não modelado aqui.

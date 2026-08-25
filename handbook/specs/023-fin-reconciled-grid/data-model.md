# Data Model — 023 (CONCILIADO no grid)

> **Sem schema novo, sem migration.** O "modelo" aqui é a derivação de leitura sobre tabelas existentes.

## Entidades / tabelas existentes (sem alteração estrutural)

### `fin_documents` (grid)

- Linha do grid de Contas a Pagar. Coluna `status` (CHECK: `Draft|Open|Approved|Transmitted|Refused|Paid|Reconciled`).
- **Não é escrita** por esta feature. O `status` exibido no DTO é derivado em leitura (ver abaixo).

### `fin_payables` (títulos pagáveis)

- FK `document_id → fin_documents.id` (indexada). Coluna `status` (mesmo enum). Estado de conciliação do título é flipado pela conciliação (`Paid ↔ Reconciled`).
- **Fonte única** do estado de conciliação.

## Derivação de leitura (read-model implícito do grid)

Para cada documento `d` na listagem:

```
total      = COUNT(fin_payables WHERE document_id = d.id)
reconciled = COUNT(fin_payables WHERE document_id = d.id AND status = 'Reconciled')

isDocReconciled = d.status = 'Paid' AND total > 0 AND total = reconciled
statusExibido    = isDocReconciled ? 'Reconciled' : d.status
```

- **Invariante (FR-004)**: parcial (`reconciled < total`) → `statusExibido = 'Paid'` (não Reconciled).
- **Reversão**: como `statusExibido` é função de `fin_payables`, o undo (Reconciled→Paid no payable) reverte automaticamente.

## Filtro (query do grid)

`status` (query param) aceita, além de `Draft|Open|Approved`, também `Paid` e `Reconciled`:

| Filtro pedido             | Condição                                                                         |
| ------------------------- | -------------------------------------------------------------------------------- |
| `Reconciled`              | `isDocReconciled` (Paid + total>0 + todos reconciliados)                         |
| `Paid`                    | `d.status='Paid'` **e NÃO** `isDocReconciled` (pago mas parcial/sem conciliação) |
| `Draft`/`Open`/`Approved` | `eq(d.status, filtro)` (inalterado)                                              |

## Transições de estado

Nenhuma nova transição de domínio. A conciliação/undo (que muda `fin_payables.status`) já existe; esta feature só **lê e deriva**.

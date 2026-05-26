# W1 — Implementação mínima

> Outcome: **GREEN**

## Mudança em `schemas/mysql.ts`

5 colunas `datetime('…', { mode: 'date', fsp: 3 })` → `date('…', { mode: 'date' })`:

| Tabela | Coluna | Nullable |
| --- | --- | --- |
| `ctr_contracts` | `original_period_start` | NOT NULL |
| `ctr_contracts` | `original_period_end` | nullable |
| `ctr_contracts` | `current_period_start` | NOT NULL |
| `ctr_contracts` | `current_period_end` | nullable |
| `ctr_amendments` | `new_end_date` | nullable |

Import de `date` adicionado ao bloco `drizzle-orm/mysql-core`. Cabeçalho do arquivo
atualizado: instantes seguem `datetime(3)`, datas-calendário viram `date`.

## Migration gerada

`pnpm run db:generate` → `0005_swift_havok.sql` com 5 `ALTER TABLE … MODIFY COLUMN … date`
(+ snapshot `meta/0005_snapshot.json` e `meta/_journal.json`).

## Mappers

**Intocados** — já convertiam `PlainDate ↔ Date` desde a Fase 2. Com `mode: 'date'`
a coluna continua entregando/recebendo `Date`; o contrato de mapeamento não muda.

## Colunas de instante (fora de escopo, inalteradas)

`signed_at`, `ended_at`, `created_at`, `homologated_at` seguem `datetime(3)` — CA4.

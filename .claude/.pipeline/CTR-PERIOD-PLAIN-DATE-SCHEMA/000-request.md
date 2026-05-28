# CTR-PERIOD-PLAIN-DATE-SCHEMA — Colunas de data-calendário `DATETIME` → `DATE`

> ## ✅ DESBLOQUEADO E FECHADO (2026-05-26)
>
> O daemon Docker passou a responder (usuário entrou no grupo `docker`).
> `pnpm run test:integration` rodou: a migration `0005` aplica e os round-trips de
> período/`newEndDate` preservam a data-calendário (CA3 cumprido para o escopo).
>
> A suíte exibe 3 falhas **pré-existentes e alheias** à migração (provadas por stash
> para as de integração; causalmente impossível para a de GRANT) — todas só visíveis
> agora porque o Docker passou a rodar. Encaminhadas como tickets próprios:
> `CTR-INFRA-READONLY-BI-GRANT`, `CTR-CLI-SMOKE-ANEXAR-DOC-STALE`, `CTR-OUTBOX-SKIPLOCKED-DUP`.
> Detalhe completo em `005-quality/REPORT.md`.

---


## Origem

Inquiry [0020](../../../handbook/inquiries/0020-temporal-api-adoption.md), **Fase 2b** (fechamento da Fase 2). A Fase 2 (`CTR-PERIOD-PLAIN-DATE`) migrou o domínio para `PlainDate` mantendo as colunas `DATETIME` com conversão na borda. Agora alinhamos o **tipo da coluna** ao conceito: data-calendário pura.

## Escopo

Trocar 5 colunas de `datetime(…, { mode: 'date', fsp: 3 })` para `date(…, { mode: 'date' })` em `schemas/mysql.ts`:
- `ctr_contracts`: `original_period_start`, `original_period_end`, `current_period_start`, `current_period_end`.
- `ctr_amendments`: `new_end_date`.

Gerar a migration (`pnpm run db:generate` → `0005_*.sql`, `ALTER TABLE … MODIFY … date`).

**Mappers permanecem intocados:** já convertem `PlainDate ↔ Date` (Fase 2). Com `mode: 'date'` a coluna continua entregando/recebendo `Date`; o `timezone: 'Z'` do pool (`mysql-driver.ts:73`) garante o round-trip como meia-noite UTC, e `PlainDate.fromDate` extrai os campos UTC corretos.

Colunas de **instante** (`signed_at`, `ended_at`, `created_at`, `homologated_at`, timestamps de outbox/document) permanecem `datetime(3)`.

## Critérios de aceitação

- CA1: as 5 colunas viram `DATE` no schema TS + migration gerada.
- CA2: mappers inalterados; `tsc` + lint + format + suíte default verdes.
- CA3: `pnpm run test:integration` verde — migration aplica e o round-trip de período/`newEndDate` preserva a data-calendário (Docker MySQL).
- CA4: colunas de instante seguem `datetime(3)`.

## Fora de escopo

- Fase 3 (swap backend `PlainDate` → `Temporal.PlainDate` no Node 26 LTS + ADR).

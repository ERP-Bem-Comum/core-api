# FIN-TIMELINE-CHANGES-BOUNDS — request

> Ticket da feature `011-financial-hardening` (US4). Origem: GitHub issue **#54** (gap-contrato, ADR-0027 contract-first).

## Problema

O response schema da trilha (`timelineEntrySchema.changes.*` em `src/modules/financial/adapters/http/schemas.ts:248-250`) não espelha os bounds de coluna do banco: `field` é `z.string()` (banco `varchar(60)`), `before`/`after` são `z.string().nullable()` (banco `text`). O OpenAPI gerado documenta os três como strings irrestritas.

## Escopo

- **Tocar apenas** `src/modules/financial/adapters/http/schemas.ts:248-250` (campos de `changes`).
- **NÃO** tocar `eventType`/`TIMELINE_EVENT_TYPES` (é do ticket #56) nem qualquer outra coisa.

## Critérios de aceite (testáveis)

- **CA1**: `changes.field` declara `.max(60)` (coerente com `varchar(60)`); 61 chars rejeitado, 60 aceito.
- **CA2**: `changes.before`/`after` declaram `.max(65535)` (limite do TEXT); 65536 rejeitado, 65535 aceito.
- **CA3**: o OpenAPI gerado exibe `maxLength` em `field`/`before`/`after`.
- **CA4** (regressão): nenhum dado válido existente (≤ limites do banco) passa a ser rejeitado.

## Definition of Done

- W0 RED → W1 GREEN; W3 verde (`typecheck` + `format:check` + `lint` + `test`); contagem de testes ≥ baseline.
- É **response** schema (saída do banco) — sem risco de input.

## Size

**S** — 2-3 linhas de produção + 1 arquivo de teste de schema.

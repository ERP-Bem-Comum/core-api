# FIN-TIMELINE-MODEL-TIDY — request

> Ticket da feature `011-financial-hardening` (US3, P3). Origem: GitHub issue **#56** (smell). Decisão #56b confirmada no /speckit-clarify: **Contrato + CHECK (migration)**.

## Problema

(a) `FinancialTimelineEntry.kind` carrega um event type mas se chama `kind` (a convenção reserva `type`/`eventType` para eventos; `kind` para variantes de entidade). (b) `DocumentCancelled` consta no enum do response schema e no CHECK da trilha, embora seja inalcançável na leitura (cancelar faz hard-delete + cascade — a trilha some junto).

## Escopo

- Rename de domínio `FinancialTimelineEntry.kind` → `eventType` (6 edições; resposta `/timeline` byte-idêntica). NÃO mexer `target.kind`/`payable.kind`.
- Novo subconjunto `TIMELINE_EVENT_TYPES` (= `DOCUMENT_EVENT_TYPES` − `DocumentCancelled`) via `exhaustiveStringUnion<Exclude<...>>`. `DocumentCancelled` PERMANECE em `DOCUMENT_EVENT_TYPES` (evento legítimo).
- Response schema (`schemas.ts:228`) usa `TIMELINE_EVENT_TYPES`.
- CHECK `ck_fin_tl_event_type` (`mysql.ts:382`) sem `DocumentCancelled` → `pnpm run db:generate` → migration `0002`.

## Critérios de aceite

- **CA1**: campo de domínio é `eventType`; `pnpm run typecheck` verde; resposta `/timeline` byte-idêntica (CT-014).
- **CA2**: response schema + CHECK não anunciam `DocumentCancelled`; integração prova que cancelar apaga a trilha (cascade) e o CHECK rejeita `DocumentCancelled`.

## Definition of Done

- W0 RED → W1 GREEN; W2 (drizzle-orm-expert) com citação (DDD naming, §IX); W3 verde + `test:integration:financial`. Migration versionada.

## Size

**M** — rename (6 edições) + `TIMELINE_EVENT_TYPES` + migration do CHECK.

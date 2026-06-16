# W1 — Implementação mínima (FIN-TIMELINE-MODEL-TIDY)

**Resultado**: 🟢 GREEN (incl. integração MySQL 14/14).

## #56a — rename `kind` → `eventType` (6 pontos)

`domain/timeline/types.ts:23`, `domain/timeline/projection.ts` (Document + Payable entries), `adapters/persistence/mappers/timeline.mapper.ts` (row→entry + entry→row), `adapters/http/dto.ts`. `target.kind`/`payable.kind` intocados.

## #56b — subconjunto + migration

- `domain/document/events.ts`: novo `TimelineEventType = Exclude<DocumentEvent['type'], 'DocumentCancelled'>` + `TIMELINE_EVENT_TYPES` (exaustivo).
- `FinancialTimelineEntry.eventType: TimelineEventType` (4 valores) — o type system forçou estreitar o domínio da trilha (DTO de 4 não aceitava os 5). Resolvido com:
  - `projectEntry`: guard `if (eventType === 'DocumentCancelled') return []` (invariante real — cancelar não gera trilha — que também narrowa o tipo).
  - `timeline.mapper.ts`: `VALID_EVENT_TYPES` agora deriva de `TIMELINE_EVENT_TYPES`; uma row com `DocumentCancelled` é rejeitada como `timeline-invalid-event-type` (defesa de leitura).
- `adapters/http/schemas.ts:228`: `z.enum([...TIMELINE_EVENT_TYPES])`.
- `mysql.ts:382`: CHECK sem `DocumentCancelled` → `pnpm run db:generate:financial` (script novo) → `migrations/mysql/0002_wandering_maddog.sql` (`ALTER ... DROP CONSTRAINT / ADD CONSTRAINT`).

## Testes (RED→GREEN)

- `projection.test.ts` — `docEntry.eventType` (gatilho RED; GREEN após rename).
- `timeline.mapper.test.ts` (novo, unit) — aceita válido, rejeita `DocumentCancelled` → `timeline-invalid-event-type`.
- `drizzle-mysql.test.ts` — cascade (já existia) + **CHECK rejeita `DocumentCancelled`** (novo, INSERT direto).

## Execução

```
pnpm run typecheck                              → verde
node --test tests/modules/financial/**/*.test.ts → 157/157 (CT-014 byte-idêntico)
pnpm run test:integration:financial             → 14/14 (migration 0002 + CHECK + cascade)
  ✔ CHECK ck_fin_tl_event_type rejeita DocumentCancelled na trilha (#56b)
```

Adicionado script `db:generate:financial` (faltava; existiam :auth/:partners/:programs).

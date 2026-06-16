# W2 — Code Review (FIN-TIMELINE-MODEL-TIDY)

**Revisor**: agente `drizzle-orm-expert` (read-only) · **Veredito**: ✅ **APPROVED** · **Round**: 1

## Resultado

| Ponto | Status |
|-------|--------|
| Migration `DROP CONSTRAINT / ADD CONSTRAINT CHECK` válida em MySQL 8.4 (SQL-padrão) | Correto |
| CHARSET/COLLATE manual necessário? | Não (sem CREATE TABLE) |
| Risco de dados existentes com `DocumentCancelled` | Baixo/teórico (hard-delete+cascade; dev/CI do zero) |
| Coerência schema TS ↔ migration `0002` ↔ snapshot (4 valores) | Exata |
| Estreitamento `TimelineEventType` + guard `return []` no projectEntry | Seguro e semântico |
| Callers dependem de entry p/ `DocumentCancelled`? | Nenhum |
| Mapper rejeita `DocumentCancelled` como `timeline-invalid-event-type` (defesa de leitura) | Correto (adapters.md) |
| JSON de `/timeline` byte-idêntico (CT-014) | Confirmado |
| Blockers / Majors | 0 / 0 |

## Citação canônica (§IX) — convenção de discriminadores

Evans, _Domain-Driven Design_ (cap. 8): "Every model represents reality from some perspective. [...] The names given to concepts reflect the way the team is beginning to think about the domain." A distinção `eventType` (discrimina eventos de domínio, derivado de `DocumentEvent['type']`) vs `kind` (discrimina variantes estruturais, ex.: `TimelineTarget`) pertence à Linguagem Ubíqua. Vernon, _Implementing DDD_ (cap. 8): eventos no passado (`DocumentSaved`, `PayableApproved`) carregam `type`/`eventType` como classe de evento.

## Minor (1) — aplicado

`z.enum([...TIMELINE_EVENT_TYPES])` → `z.enum(TIMELINE_EVENT_TYPES)` (sem spread; preserva o tipo literal em Zod 4, sem array mutável intermediário). Typecheck + timeline 10/10 verde.

Segue para W3.

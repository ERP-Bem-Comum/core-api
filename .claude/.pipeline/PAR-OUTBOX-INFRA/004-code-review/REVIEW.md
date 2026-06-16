# W2 — Code Review (PAR-OUTBOX-INFRA)

**Revisor**: agente `drizzle-orm-expert` (read-only) · **Veredito**: ✅ **APPROVED** · **Round**: 1

## Resultado

| Dimensão | Status |
|----------|--------|
| Atomicidade do append (`appendOutboxInTx` na tx do agregado; sem evento órfão) | OK |
| Concorrência (`withPendingBatch` + FOR UPDATE SKIP LOCKED na mesma tx; lock sobrevive ao handler) | OK — fiel ao CTR-OUTBOX-SKIPLOCKED-DUP |
| Idempotência (`markProcessed WHERE processed_at IS NULL`; dead-letter após maxAttempts) | OK |
| Schema/migration (CHECKs, COLLATE/ENGINE manual, índice `(processed_at,occurred_at)`) | OK — espelha `ctr_outbox` |
| Snapshot/journal Drizzle consistente | OK (CHECKs vazios no snapshot = limitação 0.45.x conhecida, emitidos no SQL) |
| Guard type-level schema↔`OutboxRow` (bidirecional) | OK |
| Isolamento ADR-0014/0006 (zero import cross-módulo; `PARTNERS_DATABASE_URL`) | OK |
| Cobertura (7 InMemory + 4 integração) | OK |
| Blockers / Majors | 0 / 0 |

## Citação canônica (§IX) — ADR-0015 §"Fluxo"

> "2. INICIAR TRANSAÇÃO / 3. Escrever mudança de domínio / 4. INSERT INTO outbox (...) / 5. COMMITAR TRANSAÇÃO ← evento existe SE E SOMENTE SE estado persistido / 6. Worker (assíncrono) lê WHERE processed_at IS NULL / 7. Worker publica / 8. Consumidor marca event_id como visto (idempotência) / 9. Worker atualiza processed_at."

ADR-0015 §"Sobre o índice": índice `(processed_at, occurred_at)` com `processed_at` PRIMEIRO (NULL agrupado, scan eficiente). ADR-0015 §"SKIP LOCKED": `FOR UPDATE SKIP LOCKED` (MySQL 8.0.1+) p/ múltiplos workers sem race.

## Desvios documentados (deliberados)

- `varchar(36)` vs `char(36)` do `ctr_outbox` — alinha com as demais `par_*`; COLLATE `utf8mb4_bin` preserva comparação binária. Seguro.
- `append` genérico (`OutboxMessage`) — desacopla US1 de US2 (o mapper de supplier é o PAR-SUPPLIER-EVENTS).

## Gaps menores aceitos (não-blocker)

1. Integração MySQL não tem `it()` dedicado a `markProcessed` idempotente (coberto no InMemory cenário 5; padrão vem do contracts).
2. `moveToDeadLetter` not-found no MySQL sem teste de integração (divergência InMemory vs Drizzle conhecida, idêntica ao contracts).

Ambos existem igualmente no `contracts` de referência e têm risco muito baixo (guard type-level + cobertura existente). Aceitos. Segue para W3.

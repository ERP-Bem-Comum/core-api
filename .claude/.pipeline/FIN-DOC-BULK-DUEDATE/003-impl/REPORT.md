# W1 — GREEN (FIN-DOC-BULK-DUEDATE)

**Agente:** fastify-server-expert (borda) + reuso de application. **Outcome:** GREEN

## Mudanças
- **Use-case** `application/use-cases/bulk-update-due-date.ts` — `bulkUpdateDueDate(deps)` reusa `adjustDocument`
  por item (caminho editMetadata de dueDate); mapeia erro → outcome (`ok`/`not-found`/`version-conflict`/`invalid-state`/`error`).
  Falha **parcial por item**; o use-case nunca falha global (`Result<..., never>`).
- **Schema** `schemas.ts` — `bulkUpdateDueDateBodySchema` (`items` 1..100 `{id:uuid, version:int≥0}`, `dueDate:iso`)
  + `bulkUpdateDueDateResponseSchema`.
- **Composição** `composition.ts` — `bulkUpdateDueDate(deps)` (mesmas deps repo+clock do adjust).
- **Borda** `plugin.ts` — rota **estática** `PATCH /financial/documents/due-date` (precede `/:id` no find-my-way);
  200 sempre com o mapa de resultados; 400 só p/ payload inválido; `authorize(write)`.

## Testes
- HTTP (memory) CA1–CA4 + CA-AUTH **5/5 GREEN**. typecheck limpo.
- x99 CA5 (lote misto ok+conflito contra MySQL real) atrás de `MYSQL_INTEGRATION=1` — o conflito de versão
  reusa o mesmo optimistic-lock já validado no bloco "Optimistic lock — Drizzle + MySQL".

## Próximo (W2)
Revisão adversarial combinada (#164 + #162): `fastify-server-expert`/`zod-expert` (borda/rota/schema) +
`drizzle-orm-expert` (filtros/orderBy) + `code-reviewer` + `security-backend-expert` (bulk write / bounds).

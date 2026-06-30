# W0 — Testes RED · FIN-PAYABLE-TITLES-ENRICH (#229)

**Agente:** tdd-strategist · **Resultado:** RED ✅

`payables-list.http.test.ts` — novo teste cria documento `NFS-229` (PIX, issueDate 2026-01-15, gross 1.000.000) e exige no item `Parent` do `GET /payable-titles`: `issueDate`, `paymentMethod`, `version`, `grossValueCents`, `netValueCents`, `dueDate` date-only.

RED: campos ausentes no `payableSummarySchema`/DTO → asserção falha (4 testes: 3 pass, 1 fail). Os 3 existentes intactos.

**Próximo (W1):** `fastify-server-expert`+`zod-expert` — propagar os 5 campos por toda a cadeia (query→mapper→drizzle/in-memory→schema→DTO) + `version` via `LoadedDocument` no `source()`.

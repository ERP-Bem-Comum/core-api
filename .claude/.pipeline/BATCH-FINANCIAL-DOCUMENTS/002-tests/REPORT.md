# W0 — Testes RED (tdd-strategist / test-pyramid-engineer)

## Teste criado

`tests/modules/financial/adapters/http/documents-batch.http.test.ts` — borda HTTP via `fastify.inject`,
driver `memory`, hooks de auth fake. Espelha `payables-batch.http.test.ts` (#357), adaptado ao contrato #358
(`ref` = documentId; campos `type`/`netValueCents`/`dueDate`).

## Cobertura (CA)

| CA | Cenário | Esperado |
|----|---------|----------|
| CA1 | sem Authorization | 401 |
| CA2 | token sem `fiscal-document:read` | 403 |
| CA3 | UUID mal-formado | 400 |
| CA4 | refs vazio | 400 (min 1) |
| CA5 | refs > 200 | 400 (max 200) |
| CA6 | [existente, inexistente] | 200 items(1) + missing |
| CA7 | `/documentsXYZ` | 404 (custom method não vaza) |

Integração real (LEFT JOIN `fin_supplier_view`) fica para W1 em `document-summary-by-ids-view.drizzle-mysql.test.ts`
(gate `MYSQL_INTEGRATION=1`), fora de `pnpm test` puro para não poluir o gate.

## Resultado: RED ✅

```
✖ CA1..CA6  — rota POST /documents:batch inexistente → 404 (esperavam 401/403/400/200)
✔ CA7       — path irmão inexistente já devolve 404 (comportamento final desejado)
```

RED por inexistência da API (fail-first). CA7 verde é esperado (ausência de rota == 404, que é o
contrato final para paths fora do custom method). Próximo: W1 implementa até GREEN.

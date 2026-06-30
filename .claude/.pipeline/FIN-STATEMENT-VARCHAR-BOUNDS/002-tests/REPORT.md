# W0 — Testes RED · FIN-STATEMENT-VARCHAR-BOUNDS (#161)

**Agente:** tdd-strategist · **Resultado:** RED ✅

`tests/modules/financial/adapters/persistence/mappers/statement-varchar-bounds.test.ts`

| Teste | CA | RED |
| --- | --- | --- |
| `memo` 600 → truncado a 500 | CA1 | ✖ (actual 600) |
| `payee_name` 300 → truncado a 255 | CA2 | ✖ (actual 300) |
| valores dentro do limite intactos | — | ✔ (controle) |

`importStatement` aceita texto longo (o domínio não impõe o bound de persistência) → confirma que o gap está no `transactionsToRows`, não no domínio.

**Próximo (W1):** `drizzle-orm-expert` — helper `truncate` + constantes (16/255/500 espelhando o schema) aplicado a `entryType`/`payeeName`/`memo`.

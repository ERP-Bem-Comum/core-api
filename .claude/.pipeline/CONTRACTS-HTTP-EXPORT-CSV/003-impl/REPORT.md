# W1 (GREEN) — CONTRACTS-HTTP-EXPORT-CSV (C4)

> Agente: `fastify-server-expert` (main thread) · Driver: memory · Outcome: **GREEN** (9/9)

## O que foi implementado

### `contracts-csv.ts` (novo) — serializador puro
- `contractsToCsv(readonly Contract[]) => string`. Reusa `contractToListItem` (C1) para achatar o agregado
  discriminado por `status` em 13 colunas (D2); `cellsFor` é switch exaustivo por status (campos efetivos
  só em Active/Expired/Terminated; `endedAt` só nos terminais; `Period.Indefinite` → `*PeriodEnd` vazio).
- **Anti-fórmula (D3):** `neutralizeFormula` prefixa `'` quando a célula inicia em `= + - @ \t \r`.
- **RFC 4180 (D4):** `escapeCell` envolve em aspas células com `,"\n\r` e duplica `"` interno. Separador
  `,`, terminador `\r\n`.
- **BOM UTF-8 (D5)** no início.

### `schemas.ts`
- `csvResponse()` — factory de response `text/csv` (schema `z.string()`) para o OpenAPI documentar sem
  forçar JSON. Factory pela mesma razão do corpo binário (evita reuso de referência no zod-openapi).

### `plugin.ts`
- Rota `GET /contracts/export.csv` `[requireAuth, authorize('contract:read')]` (reader). **Estática** —
  vence `/:id` (find-my-way, `Routes.md:253`). Handler: `listContracts` → `contractsToCsv` → envia via
  `reply.type('text/csv; charset=utf-8').header('content-disposition','attachment; filename="contracts.csv"').send(csv)`.
  Erro de repo → envelope JSON (503).

## Achado técnico

O `serializerCompiler` do `fastify-zod-openapi` com `response.200.content['text/csv'] = z.string()` **não
corrompeu** a string CSV (não re-encodou como JSON) — o BOM, o quoting RFC 4180 e a neutralização de fórmula
chegam intactos ao cliente. Confirmado pelos asserts de `res.body` (CA2/CA4/CA5).

## Evidência GREEN

```
contracts-export-csv.routes.test.ts → tests 9 · pass 9 · fail 0
  (authz 401/403, happy 200+headers+BOM+colunas, vazio só-cabeçalho, formula injection, quoting RFC 4180,
   OpenAPI text/csv, roteamento estático, regressão list)
suíte completa → tests 1547 · pass 1531 · fail 0 · skipped 16 (gate integração auth)
```

Gates antecipados W3: `typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `test` ✓.

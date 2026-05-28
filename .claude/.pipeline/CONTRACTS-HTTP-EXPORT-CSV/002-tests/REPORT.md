# W0 (RED) — CONTRACTS-HTTP-EXPORT-CSV (C4)

> Skill: `tdd-strategist` · Driver: memory · Outcome: **RED** (8 fail / 1 pass-regressão)

## Teste escrito

`tests/modules/contracts/adapters/http/contracts-export-csv.routes.test.ts` — 9 casos via `app.inject`:

| CA | Caso | Esperado |
| :-- | :-- | :-- |
| CA1 | sem token / token sem `contract:read` | 401 / 403 |
| CA2 | com `contract:read` + 2 contratos | 200, `text/csv`, attachment, BOM, cabeçalho + 2 linhas |
| CA3 | lista vazia | 200, só o cabeçalho |
| CA4 | `title` = `=SOMA(A1:A9)` | célula neutralizada `'=SOMA(A1:A9)` (formula injection) |
| CA5 | `objective` com vírgula + aspas | quotado RFC 4180 (`"...""...""..."`) |
| CA6 | `/docs/json` | `/api/v2/contracts/export.csv` com response `text/csv` |
| CA7 | roteamento | `export.csv` responde 200 CSV (não 400 de uuid em `/:id`) |
| CA8 | regressão `GET /contracts` (list) | 200 |

## Evidência RED

```
tests 9 · pass 1 · fail 8
```

Falham por: rota `GET /contracts/export.csv` inexistente (404) — até o CA1 "sem token" dá 404 (rota não
existe, antes do auth). O único `pass` é o CA8 (a list do C0 já existe). GREEN quando a rota + o serializador
`contractsToCsv` existirem.

## Cabeçalho esperado (D2 — ordem fixa)

```
id,sequentialNumber,title,objective,status,originalValueCents,originalPeriodStart,originalPeriodEnd,signedAt,currentValueCents,currentPeriodStart,currentPeriodEnd,endedAt
```

## API que o W1 deve entregar

```
contracts-csv.ts (novo): contractsToCsv(readonly Contract[]) => string — BOM + cabeçalho + linhas;
                         escape RFC 4180 (D4) + neutralização de fórmula =,+,-,@,\t,\r (D3); reusa contractToListItem.
plugin.ts: GET /contracts/export.csv [requireAuth, authorize('contract:read')] (reader); envia via
           reply.type('text/csv; charset=utf-8').header('content-disposition','attachment; filename="contracts.csv"').send(csv).
schemas.ts (se necessário): response 200 content text/csv para o OpenAPI (padrão `content`, factory).
```

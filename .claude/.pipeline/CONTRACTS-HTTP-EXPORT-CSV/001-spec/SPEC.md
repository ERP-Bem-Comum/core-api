# SPEC — CONTRACTS-HTTP-EXPORT-CSV (C4)

> Refina [`000-request.md`](../000-request.md). Decisões resolvidas por default (sem impacto em
> dependências/ADRs — não houve sessão de design). Aprovação humana antes do W1.

## 1. Endpoint

`GET /api/v2/contracts/export.csv` · `[requireAuth, authorize('contract:read')]` · leitura no **reader**.

- **Roteamento (CA7):** rota **estática** `export.csv` — o Fastify/find-my-way checa estáticas antes das
  paramétricas (`handbook/reference/fastify/Reference/Routes.md:253`: "Static routes are always checked
  before parametric"), logo **não colide** com `GET /contracts/:id`.
- Resposta: `200` com `Content-Type: text/csv; charset=utf-8` +
  `Content-Disposition: attachment; filename="contracts.csv"`. Corpo = CSV (string), **não-JSON**.

## 2. Decisões cravadas

- **D1 — Serializador puro novo:** `contractsToCsv(contracts: readonly Contract[]) => string` em
  `adapters/http/contracts-csv.ts`. Reusa `contractToListItem` (C1) para achatar o agregado em campos
  planos (evita reduplicar a lógica de `status`/`Period`/`Money`).
- **D2 — Colunas (ordem fixa):**
  `id, sequentialNumber, title, objective, status, originalValueCents, originalPeriodStart,
  originalPeriodEnd, signedAt, currentValueCents, currentPeriodStart, currentPeriodEnd, endedAt`.
  Campos não aplicáveis ao `status` ficam **vazios** (Pending: `signedAt`/`current*`/`endedAt` vazios;
  Active/Expired/Terminated: preenchem `current*`/`signedAt`; só terminais preenchem `endedAt`; período
  `Indefinite`: `*PeriodEnd` vazio). Money serializado como inteiro de centavos; datas ISO 8601.
- **D3 — Formula injection (MUST segurança):** toda célula cujo valor textual inicie com `= + - @`,
  TAB (`\t`) ou CR (`\r`) é prefixada com aspa simples (`'`) antes do quoting. Aplica-se aos campos de
  texto livre (`title`, `objective`, `sequentialNumber`).
- **D4 — Quoting RFC 4180:** célula que contenha `,`, `"` ou `\n`/`\r` é envolta em aspas duplas; `"`
  interno vira `""`. Separador `,`; terminador de linha `\r\n`.
- **D5 — BOM UTF-8:** o CSV inicia com BOM (`﻿`) para o Excel reconhecer acentuação PT-BR.
- **D6 — Permissão `contract:read`** (leitura) — reusa o RBAC do C1.
- **D7 — Sem streaming:** serialização em memória (o `listContracts` já materializa tudo). Streaming
  (`nodejs-fs-scripter`) é evolução futura se o volume exigir — fora do C4.
- **D8 — OpenAPI:** `response 200` documentado com `content: text/csv` (schema `string`), via o padrão
  `content` do `fastify-zod-openapi` (mesma técnica do corpo binário do C3) — **factory** se reusar schema.

## 3. Mapeamento erro → HTTP

| Caso | HTTP |
| :-- | :-: |
| Sem token / token inválido | 401 (`requireAuth`) |
| Sem `contract:read` | 403 (`authorize`) |
| `contractRepo` indisponível | 503 (`contract-repo-unavailable`) |
| Sucesso | 200 (text/csv) |

Erro de repo → `sendResult`/envelope JSON (o cliente recebe JSON no erro; só o 200 é CSV).

## 4. Critérios de aceitação

- **CA1 (authz):** sem token → 401; sem `contract:read` → 403.
- **CA2 (happy):** com `contract:read` → 200, `Content-Type: text/csv`, `Content-Disposition: attachment`,
  1ª linha = cabeçalho de colunas (D2), 1 linha por contrato seedado (reader).
- **CA3 (vazio):** sem contratos → 200, só o cabeçalho.
- **CA4 (formula injection):** contrato com `title` iniciando em `=`/`+`/`-`/`@` → célula prefixada por `'`.
- **CA5 (quoting):** `objective` com vírgula/aspas/quebra → quotado RFC 4180 (`""` para aspas internas).
- **CA6 (OpenAPI):** `/docs/json` contém `/api/v2/contracts/export.csv` com response `text/csv`.
- **CA7 (roteamento):** `export.csv` não é capturado por `GET /contracts/:id` (não retorna 400 de uuid).
- **CA8 (regressão):** C0-C3 + hardening intactos.

## 5. Arquivos previstos (W1)

- `contracts-csv.ts` (novo) — `contractsToCsv` + helpers de escape (formula + RFC 4180) puros e testáveis.
- `schemas.ts` — schema de response `text/csv` (se necessário para o OpenAPI).
- `plugin.ts` — rota `GET /contracts/export.csv` + headers; envia CSV via `reply.type(...).send(...)`.
- `contracts-export-csv.routes.test.ts` (W0). Idealmente um teste unitário do `contractsToCsv` (escape).

## 6. Fora de escopo

Filtros/paginação do export; streaming; XLSX/PDF; E2E docker (C5).

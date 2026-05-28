# CONTRACTS-HTTP-EXPORT-CSV (C4) — exportação CSV da listagem

## Origem

[`EPIC-CONTRACTS-HTTP`](../../.planning/EPIC-CONTRACTS-HTTP.md) §10 C4.
Quinta fatia da borda HTTP de contratos: expõe a listagem de contratos como **CSV** para download.
Leitura no **reader** (ADR-0026), protegida por `requireAuth` + `authorize('contract:read')`. Depende do C1.

## O que este ticket entrega

1. Rota `GET /api/v2/contracts/export.csv` — chama `listContracts` (reader) e serializa o resultado em
   **text/csv** (RFC 4180), com `Content-Disposition: attachment; filename="contracts.csv"`.
2. Serializador CSV novo (não há serialização CSV no projeto; os formatters da CLI são PT-BR para humanos,
   não CSV). Função pura `contractsToCsv(contracts) => string` em `adapters/http/`.
3. Resposta **não-JSON**: o serializer Zod não se aplica; o handler envia a string via
   `reply.type('text/csv; charset=utf-8').send(csv)`. OpenAPI documenta `response` como `text/csv`.

## Decisões pendentes (resolver na SPEC)

1. **CSV/Formula injection (MUST de segurança):** células iniciando com `= + - @` (e `\t`, `\r`) devem ser
   neutralizadas (prefixo `'`) — senão o Excel/Sheets executa fórmula. `security-backend` MUST.
2. **Quoting RFC 4180:** campos com `,`/`"`/`\n` entre aspas duplas; `"` interno duplicado.
3. **Colunas:** definir o conjunto (ex.: `id, sequentialNumber, title, objective, status, originalValueCents,
   currentValueCents, periodStart, periodEnd, signedAt, endedAt`) — campos de estado efetivo só quando
   aplicável (Pending não tem `current*`/`signedAt`).
4. **BOM UTF-8:** prefixar `﻿` para o Excel reconhecer acentuação? (provável sim, dado PT-BR nos dados).
5. **Permissão:** `contract:read` (é leitura). Reusa o RBAC do C1.
6. **Streaming:** MVP serializa em memória (o `listContracts` já carrega tudo); streaming (nodejs-fs-scripter)
   é YAGNI agora — registrar como evolução se o volume exigir.
7. **OpenAPI:** documentar `response 200` com content `text/csv` (fora do type-provider Zod, como o corpo
   binário do C3 — usar o padrão `content` do fastify-zod-openapi).

## Critérios de aceitação (a consolidar na SPEC)

- **CA1 (authz):** sem token → 401; token sem `contract:read` → 403.
- **CA2 (happy):** com `contract:read` → 200, `Content-Type: text/csv`, `Content-Disposition: attachment`,
  cabeçalho de colunas + 1 linha por contrato (reader).
- **CA3 (lista vazia):** → 200 com só o cabeçalho (CSV válido sem linhas de dados).
- **CA4 (formula injection):** contrato com campo textual iniciando em `=`/`+`/`-`/`@` → célula neutralizada.
- **CA5 (quoting):** campo com vírgula/aspas/quebra → quotado RFC 4180.
- **CA6 (OpenAPI):** `/docs/json` contém `/api/v2/contracts/export.csv` com response `text/csv`.
- **CA7 (regressão):** C0-C3 intactos; a rota `export.csv` não colide com `GET /contracts/:id` (rota
  estática vs paramétrica — ordem de roteamento).

## Fora de escopo

- Filtros/paginação do export (exporta tudo). Streaming de grandes volumes. Outros formatos (XLSX/PDF).
- E2E docker → C5.

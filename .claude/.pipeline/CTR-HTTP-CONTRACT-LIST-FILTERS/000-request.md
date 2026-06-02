# CTR-HTTP-CONTRACT-LIST-FILTERS — filtros + paginação no GET /contracts

> **Size:** M · **Origem:** [po-feedback/0001 §B Bucket B #4/#5](../../../handbook/po-feedback/0001-gap-api-v2-contracts.md). Gap de **borda** + repositório.

## Contexto

O `GET /contracts` hoje devolve a **lista completa** sem filtros nem paginação (`plugin.ts:149-164`, `listContracts()`). O relatório da P.O. (§3.5) pede filtros avançados + paginação com **meta**, e que o response seja um objeto paginado, não array cru.

## Escopo

- **Query params** validados por Zod na rota: `page`, `limit`, `search` (texto em title/objective/sequentialNumber), `status`, `order` (ASC|DESC). Date range / value range: avaliar em W0 (P2 — pode ficar fora do 1º corte).
- **Filtragem + paginação no repositório** (Drizzle `WHERE`/`LIMIT`/`OFFSET` + `COUNT`), **nunca** em memória.
- Response paginado: `{ items: ContractListItem[], meta: { page, limit, total, totalPages } }`.
- ⚠️ Filtros que dependem de campos ainda inexistentes no domínio (`contractType`, etc.) ficam **fora deste ticket** — entram quando o agregado ganhar esses atributos (ADR-0032). Este ticket cobre o que já existe: status, busca textual, ordenação, paginação.

## Critérios de Aceite

- [ ] CA1 — `?page=&limit=` pagina via SQL (`LIMIT`/`OFFSET`); `meta` com `total`/`totalPages` corretos.
- [ ] CA2 — `?search=` filtra por title/objective/sequentialNumber.
- [ ] CA3 — `?status=` filtra pelos estados existentes (Pending/Active/Expired/Terminated).
- [ ] CA4 — `?order=` ordena (por data/sequentialNumber — definir em W0).
- [ ] CA5 — params inválidos → 400 (Zod); defaults sensatos (page=1, limit=N).
- [ ] CA6 — filtragem **no banco** (provar via teste de integração que não traz tudo e filtra em memória).
- [ ] CA7 — OpenAPI atualizado; o `export.csv` continua funcionando (reusar/compatibilizar o filtro).

## Pipeline

W0 RED → W1 (Zod query + repo paginado + DTO meta) → W2 → W3. Skills: `fastify` + `drizzle-orm-expert` + `mysql-database-expert` (índice para o filtro/ordenação).

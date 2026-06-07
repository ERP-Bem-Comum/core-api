# Phase 0 — Research: `003-partners-aggregator-export`

> Decisões consolidadas. As 2 incógnitas materiais foram resolvidas no `/speckit-clarify` (sessão 2026-06-06)
> com parecer dos especialistas (mysql-database-expert, security-backend-expert) + MCP `acdg-skills` (DDD/CQRS).
> **Nenhum `NEEDS CLARIFICATION` remanescente.**

## R1 — Estratégia de paginação/ordenação do agregador

- **Decision**: **merge in-memory**. `Promise.all` lê os 4 readers (lista completa), projeta para `PartnerListItem`, aplica `search`/`type`, faz merge, ordena por **`(name ASC, type ASC, id ASC)`** (tie-break determinístico) e pagina **após** o merge. Safety cap `MAX_TOTAL = 10_000` (soma dos 4): se exceder, **503** (`partners-aggregate-too-large`).
- **Rationale**: consistente com o padrão já existente do `partners` — os readers expõem só `list()` (lista completa) e as rotas por-tipo já filtram/paginam in-memory (`paginateRecords` em `supplier-list-query.ts`). Volume de cadastro (centenas/poucos milhares) torna 4 SELECTs full + merge baratos; o cap evita OOM em crescimento inesperado.
- **Alternatives considered**:
  - _Paginação por-tipo (cotas)_ — rejeitada (meta/ordenação inconsistentes para um seletor).
  - _Refatorar readers p/ paginação no DB (keyset/UNION)_ — adiada (refactor grande dos 4 readers + 4 tabelas `par_*`; fora do escopo P2). Gatilho futuro: `EXPLAIN type=ALL` sob carga / p95 > SLO / total > ~5k.

## R2 — Permissão do agregador `GET /partners`

- **Decision**: **AND das 4 permissões de leitura** — `supplier:read` **E** `financier:read` **E** `collaborator:read` **E** `act:read`. Sem permissão nova.
- **Rationale**: o agregador alimenta o seletor de contratado (feature 002); quem cria contrato pode contratar qualquer tipo → deve ler os 4. Least-privilege sem over-grant (evita criar um `partner:read` que "vê tudo"); simples de auditar (parecer security-backend-expert).
- **Alternatives considered**:
  - _`partner:read` dedicada_ — rejeitada (risco de over-grant; permissão nova).
  - _Filtro dinâmico por permissão (interseção)_ — adiada (least-privilege real, mas meta varia por caller + risco de timing side-channel; exigiria filtrar ANTES de despachar). ADR futuro se surgir perfil de subconjunto.

## R3 — Projeção `PartnerListItem`

- **Decision**: `{ type: 'supplier'|'financier'|'collaborator'|'act', id, name, document, active }`, extraída do agregado dentro de cada `*ReadRecord` (que envolve `{ <aggregate>, legacyId, createdAt, updatedAt }`). `document` = `cnpj` (supplier/financier) ou `cpf` (collaborator/act); `active` derivado do `status` do agregado.
- **Rationale**: projeção plana read-only (CQRS read-side — Vernon p.193); não expõe o agregado interno (ADR-0014). Tipo discriminado por `type` para a borda tratar uniformemente.

## R4 — Paridade de export CSV

- **Decision**: criar `financier-csv.ts` e `act-csv.ts` espelhando `supplier-csv.ts` (HEADER fixo + `toCsv` do util compartilhado). `collaborators/export` reusa `collaborator-csv.ts` (já existe). Cada rota reusa o filtro/`*ForExport` da listagem do tipo.
- **Rationale**: padrão estabelecido (`supplier-plugin` + `supplier-csv`); util `shared/utils/csv.ts` já faz escape anti-injection + RFC 4180 (Princ. III, ADR-0002). Adapter de apresentação puro (Princ. V).
- **Alternatives considered**: _porta genérica N-formatos_ — rejeitada (YAGNI; só CSV).

## Premissas validadas no recon (código real)

- Os 4 readers existem (`supplier`/`financier`/`collaborator`/`act-reader.ts`) com `list()` retornando lista completa.
- `supplier-list-query.ts` já expõe `paginateRecords`/`queryToFilter`/`*ForExport` (reuso/espelho).
- `supplier-csv.ts` + `collaborator-csv.ts` existem; `financier-csv.ts`/`act-csv.ts` faltam.
- Permissões `supplier/financier/collaborator/act:read` existem em `public-api/permissions.ts` (sem `partner:read`).
- Plugins por-tipo existem (`supplier/financier/act-plugin.ts` + `plugin.ts` p/ collaborators) — pontos de extensão das rotas de export.

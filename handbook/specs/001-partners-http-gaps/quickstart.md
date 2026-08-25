# Quickstart: épico `partners-http-gaps`

**Feature**: `specs/001-partners-http-gaps/` · Como desenvolver e validar os tickets.

## Pré-requisitos

- Branch `001-partners-http-gaps`; `pnpm install` em dia.
- MySQL local (para integração territorial): `pnpm run test:integration` sobe via Docker compose `--wait`.
- MCP `acdg-skills` conectado (citação nas waves de rigor).

## Ordem de execução (tickets W0→W3)

```
1. CORE-CSV-PARSE-UTIL            (S) — base do import
2. PARTNERS-COLLAB-IMPORT-HTTP    (M) — depende de #1
3. PARTNERS-SUPPLIER-EXPORT-HTTP  (S)
4. PARTNERS-SERVICE-CATEGORIES-HTTP (S)
5. PARTNERS-TERRITORY             (L) — domínio + 2 tabelas + plugin
6. PARTNERS-COLLAB-FILTERS-DECISION (S)
```

Cada ticket: `pnpm run pipeline:state init <TICKET> --size <S|M|L>` → W0 RED → W1 → W2 → W3.

## Comandos de qualidade (W3 — gate verde)

```bash
pnpm run typecheck
pnpm run format:check
pnpm run lint
pnpm test
pnpm run test:integration     # tickets que tocam persistência (#5)
pnpm run db:generate --config drizzle.config.partners.ts   # após editar schemas/mysql.ts (#5)
```

## Validação por ticket (smoke via Bruno / fastify.inject)

- **#1**: `parseCsv('a,b\n1,2')` → `Table{ headers:['a','b'], rows:[['1','2']] }`; vazio → `err('csv-empty')`.
- **#2**: `POST /api/v1/collaborators/import` (CSV válido) → `{created:N, failed:[]}`; com linha inválida → parcial.
- **#3**: `GET /api/v1/suppliers/export?active=true` → `text/csv` filtrado.
- **#4**: `GET /api/v1/suppliers/service-categories` → 39 itens.
- **#5**: `POST /api/v1/partner-states/SP` → `{uf:'SP', isPartner:true}`; `DELETE` → `isPartner:false` (persistido); município cross-state preservado.
- **#6**: `GET /api/v1/collaborators?programa=x` → query `programa` ignorada/não documentada.

## Casos-chave a cobrir (TDD — escreva antes)

- Util `parseCsv` rejeita vazio/malformado (MF-001 da metrics).
- Import parcial não perde válidas (MF-001).
- Toggle territorial idempotente + CHECK soft-delete (MF-002/MF-003).
- Catálogo = 39 literais com typos (MF-004).
- Toda rota nova: 401 sem sessão, 403 sem permissão, `requestId` no envelope (NFR-001/002).
- Contrato HTTP ↔ server fn do BFF (MF-006).

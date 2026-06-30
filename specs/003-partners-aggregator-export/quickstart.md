# Quickstart — `003-partners-aggregator-export`

> Como exercitar as rotas depois de implementadas. Borda `/api/v1` (server HTTP ativo). Sem migration.

## 1. Agregador de busca

```bash
TOKEN=<bearer com supplier:read+financier:read+collaborator:read+act:read>

# Todos os tipos, paginado
curl -sS "http://localhost:<port>/api/v1/partners?page=1&limit=20" -H "Authorization: Bearer $TOKEN"
# → { items: [{ type, id, name, document, active }...], meta: { page, limit, total, totalPages } }

# Filtra por tipo + busca
curl -sS "http://localhost:<port>/api/v1/partners?type=supplier&search=coop" -H "Authorization: Bearer $TOKEN"

# type inválido → 400 ; sem uma das 4 reads → 403 ; sem token → 401
```

## 2. Export CSV (paridade)

```bash
curl -sS "http://localhost:<port>/api/v1/collaborators/export" -H "Authorization: Bearer $TOKEN" -i
curl -sS "http://localhost:<port>/api/v1/financiers/export"    -H "Authorization: Bearer $TOKEN" -i
curl -sS "http://localhost:<port>/api/v1/acts/export"          -H "Authorization: Bearer $TOKEN" -i
# → 200 text/csv; Content-Disposition: attachment; X-Content-Type-Options: nosniff
# 0 registros → só cabeçalho. Campos =/+/-/@ escapados.
```

## 3. Testes (W0→W3 por ticket)

```bash
pnpm test                                   # unit (projeção/serializers) + rotas (fastify.inject)
pnpm run typecheck && pnpm run format:check && pnpm run lint   # gate W3
```

Suítes-chave: `partner-aggregate-query.test.ts`, `partners-aggregate.routes.test.ts`,
`financier-csv.test.ts`, `act-csv.test.ts`, `partners-export-parity.routes.test.ts`.
Sem integração MySQL nova (feature de leitura/serialização na borda).

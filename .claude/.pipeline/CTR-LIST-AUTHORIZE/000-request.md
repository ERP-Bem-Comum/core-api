# CTR-LIST-AUTHORIZE — Request (#202)

**Size:** S · **Feature SDD:** `specs/022-contracts-list-authorize/` · **Prioridade:** P2 (achado de segurança)

## Problema

`GET /api/v2/contracts` (listagem) aplica apenas `requireAuth` (`src/modules/contracts/adapters/http/plugin.ts:178-180`) — **qualquer usuário autenticado lista contratos** (número, contraparte, valores, vigência, status) sem ter `contract:read`. Inconsistente com as demais leituras do módulo, que já exigem `contract:read`: `/contracts/:id` (`:250`), `/contracts/:id/history` (`:351`), `/contracts/export.csv` (`:224`).

**≠ #200**: `contract:read` já está no catálogo central — não há gap de catálogo, só o guard ausente na rota (o comentário `:246` "GET /contracts permanece enxuto" é a origem do esquecimento).

## Escopo (mínimo)

- Trocar o `preHandler` da listagem de `hooks.requireAuth` para `[hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)]`.
- **Sem** alteração do contrato de resposta (campos/filtros/paginação), permissão nova, migration, evento ou rota nova.

## Critérios de aceite

- **CA1**: autenticado **sem** `contract:read` → **403** em `GET /contracts` (antes: 200, vazamento).
- **CA2**: sem token → **401**.
- **CA3**: com `contract:read` → **200**, resposta inalterada (com e sem filtro).
- **CA4**: cobertura exercita o `authorize` **REAL** (`buildAuthHttpDeps`+seed) cobrindo o caso negado — guard anti-regressão (FR-006/SC-004).
- **CA5**: listagem exige a **mesma** permissão de detalhe/histórico/exportação (SC-005).
- **CA6**: gate W3 verde.

## Referências

Issue #202 · Plano: `specs/022-contracts-list-authorize/plan.md` · Citações: `research.md` (OWASP least-privilege + Fowler self-testing).

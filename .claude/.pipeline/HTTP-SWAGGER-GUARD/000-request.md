# HTTP-SWAGGER-GUARD — Swagger/OpenAPI dev-only (F1)

**Size:** S · **Origem:** auditoria `security-backend-expert` (F1, Alto) · **Branch:** `005-gestao-usuarios`

> A doc é proposital (DEV-ONLY, conforme `ERP-INFRA/local/up.sh`), mas o registro é incondicional —
> `/docs` e `/docs/json` ficam abertos em produção, expondo o mapa completo da API. Fix: condicionar
> o registro do `@fastify/swagger` + `@fastify/swagger-ui` a `NODE_ENV !== 'production'`. Estratégia
> escolhida pelo usuário: dev-only (mantém em dev/homolog, esconde em prod).

## Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `src/shared/http/app.ts` — condicionar swagger/swaggerUi a ambiente != production |
| Criar (teste) | `tests/shared/http/swagger-guard.test.ts` |

## Critérios de aceite (W0 — RED)

- **CA1**: `NODE_ENV=production` → `GET /docs/json` → 404.
- **CA2**: `NODE_ENV=production` → `GET /docs` → 404.
- **CA3**: `NODE_ENV=development` → `GET /docs/json` → 200 (openapi 3.1.1) — preserva a intenção dev.

## Nota de regressão

Os testes existentes que consultam `/docs/json` (bootstrap, authz-hook, routes, session, contracts)
rodam sob `pnpm test` sem `NODE_ENV=production` → swagger registrado → permanecem verdes.

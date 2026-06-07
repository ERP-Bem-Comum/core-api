# W1 — Implementação · HTTP-SWAGGER-GUARD

**Agente:** security-backend-expert · **Outcome:** GREEN

## Mudança

`src/shared/http/app.ts` — registro de `@fastify/swagger` + `@fastify/swagger-ui` envolvido em
`if (process.env['NODE_ENV'] !== 'production')`. Em produção, `/docs` e `/docs/json` deixam de existir
(404 via notFoundHandler). Dev/homolog mantêm a doc (intenção do projeto).

## Verde

```
swagger-guard: tests 3 · pass 3
suite completa: 2379 pass · 0 fail
```

Sem regressão: os testes que consultam `/docs/json` (bootstrap, authz-hook, routes, session,
contracts) rodam sem `NODE_ENV=production` → swagger registrado → permanecem verdes. As rotas de
negócio não dependem do swagger (validação Zod via validator/serializer compiler, independentes).

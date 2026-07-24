# W0 — AUDIT-FASTIFY-ADVISORIES (#573) — RED

**Agente:** `pnpm-workspace-expert` (supply-chain). RED reproduzido antes do fix:

```
pnpm audit --prod --audit-level=high  →  exit 1
- GHSA-c96f-x56v-gq3h  find-my-way <=9.6.0  (DDoS HTTP2)      via fastify
- GHSA-83w8-p2f5-377r  @fastify/static <=10.1.0 (guard bypass) via @fastify/swagger-ui
```

Regressão de compatibilidade adicionada (W0 do lado do código): `tests/shared/http/docs-static-serving.test.ts`
— boota a app em dev e faz `GET /docs`, provando que o `@fastify/static@10` (o fix) NÃO quebra o serviço
da UI do swagger-ui. (Falharia se o major 10 fosse incompatível com o `@fastify/swagger-ui@5.2.6`.)

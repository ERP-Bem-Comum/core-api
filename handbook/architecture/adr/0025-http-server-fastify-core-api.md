[← Voltar para ADRs](./README.md)

# ADR-0025: Servidor HTTP no `core-api` com Fastify (adapter de borda, BFF continua burro)

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Relacionado:** [ADR-0005](./0005-thin-bff-gateway.md) (BFF burro — NÃO superseded), [ADR-0006](./0006-modular-monolith-core-api.md) (domínio sem framework), [ADR-0024](./0024-identity-and-rbac-auth-module.md) (auth via HTTP), [Inquiry-0007](../../inquiries/0007-http-framework-fastify-vs-express.md) (Fastify vs Express)

---

## Contexto

Até aqui o core-api é **CLI-first**: a CLI é a UX primária e não há servidor HTTP. O agente `fastify-server-expert` está marcado como *reservado, aguardando ADR de adoção*. Dois fatos tornam a adoção necessária agora:

1. A **exposição HTTP do módulo Contratos** já estava sendo planejada — o [ADR-0023](./0023-contract-lifecycle-pending-state.md) nasceu exatamente disso (ACL sobre o `openapi.yaml` legado), com HTTP bloqueado só até a revisão de domínio entrar (CHANGELOG 2026-05-27).
2. O **módulo `auth`** ([ADR-0024](./0024-identity-and-rbac-auth-module.md)) precisa expor `login`/`refresh`/`logout` e emitir credencial — o que exige um servidor HTTP no core-api.

O [ADR-0005](./0005-thin-bff-gateway.md) já fixou que o BFF é burro e roteia `/api/v2/*` ao core-api. Falta decidir **o servidor HTTP dentro do core-api**.

---

## Decisão

Adotar **Fastify** como o **adapter HTTP de borda** do core-api. Isso **ativa** o agente `fastify-server-expert`.

### Fronteiras (o que o servidor HTTP é e não é)

- É um **adapter** na camada `adapters/` (ports & adapters, ADR-0006). Recebe request → valida payload (smart constructors do domínio) → chama use case → **traduz `Result<T,E>` em status HTTP**. `throw` permitido só aqui, convertido na borda.
- **Domínio e application permanecem sem framework** — garantia explícita do `0006-modular-monolith-core-api.md:152` ("Domínio sem framework [...] Falha esperada se ausente: Lógica de negócio acoplada a Hono/Fastify").
- **Não duplica o BFF.** O BFF continua burro ([ADR-0005](./0005-thin-bff-gateway.md) **não é superseded**): roteia `/api/v2/*` → core-api, valida o access token JWT (cross-cutting), aplica rate limit. O core-api **emite** credencial e contém a regra; o BFF nunca acessa banco nem contém regra.

### Convenções

- Roteamento sob `/api/v2/*` (o BFF mapeia para o core-api).
- Validação de **todo** request body via smart constructors do domínio antes de chamar o use case.
- Composition root único monta o servidor e injeta os adapters (repos, hasher, token issuer, clock).
- Logging estruturado (Pino, nativo do Fastify) com `request-id` propagado do BFF.

---

## Consequências

### Positivas

- Desbloqueia auth (ADR-0024) e a exposição HTTP de Contratos (ADR-0023).
- Fastify traz validação por schema, hooks e Pino com baixo overhead — e já era o candidato preferido (Inquiry-0007).
- Domínio intocado: a borda HTTP é mais um adapter, como a CLI já é.

### Negativas

- Nova superfície de ataque (HTTP) — exige hardening (helmet, rate limit, CORS, validação estrita).
- Mais um modo de execução para testar (a CLI continua existindo para Contratos).

### Neutras

- A stack HTTP interna era declarada "decisão menor" pelo próprio ADR-0005 (`:51`); este ADR a fixa em Fastify para o core-api.

---

## Alternativas Consideradas

### A. Continuar CLI-only

**Rejeitada porque:** não há como autenticar/emitir credencial nem servir o front sem HTTP. Bloquearia ADR-0023 e ADR-0024.

### B. Express

**Rejeitada porque:** Inquiry-0007 já favoreceu Fastify (schema validation nativo, Pino, performance). Reabrir seria retrabalho.

### C. Hono

**Rejeitada nesta fase porque:** Hono brilha no edge/BFF; para o core-api (Node, ports & adapters, validação por schema) Fastify tem ecossistema mais maduro de plugins server-side. Hono permanece candidato para o BFF.

---

## Quando Re-avaliar

- Se o core-api precisar rodar no edge/serverless (reconsiderar Hono).
- Se surgir requisito de gRPC/streaming que o Fastify não atenda bem.

---

## Referências

- [ADR-0005](./0005-thin-bff-gateway.md) — BFF burro (mantido; `:26-27`, `:51`, `:57-67`).
- [ADR-0006](./0006-modular-monolith-core-api.md) — domínio sem framework (`:152`).
- [ADR-0024](./0024-identity-and-rbac-auth-module.md) — auth exposto via HTTP.
- [ADR-0023](./0023-contract-lifecycle-pending-state.md) — exposição HTTP de Contratos (origem do planejamento).
- [Inquiry-0007](../../inquiries/0007-http-framework-fastify-vs-express.md) — Fastify vs Express.

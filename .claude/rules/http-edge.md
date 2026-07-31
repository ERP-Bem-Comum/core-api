---
paths:
  - "src/shared/http/**/*.ts"
  - "src/modules/*/adapters/http/**/*.ts"
  - "tests/modules/*/adapters/http/**/*.ts"
  - "src/server.ts"
---

# Regras invariantes — Borda HTTP

A borda HTTP é a **UX primária** do core-api ([ADR-0037](../../handbook/architecture/adr/0037-http-first-retire-embedded-cli.md)). Nada aqui é enforced mecanicamente: o glob de borda no `eslint.config.js:299` apenas **afrouxa** regras para os tipos do Fastify — as invariantes abaixo dependem de disciplina.

## Onde cada coisa mora ([ADR-0028](../../handbook/architecture/adr/0028-http-edge-shell-location.md))

| Responsabilidade      | Local                              | Conteúdo                                                                    |
| --------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| Shell transversal     | `src/shared/http/`                 | `buildApp`, error handler/envelope, `sendResult` (Result→HTTP), config, OpenAPI |
| Composition root      | `src/server.ts`                    | lê env, `buildApp({ routes })`, `listen`, graceful shutdown                  |
| HTTP de cada feature  | `src/modules/<m>/adapters/http/`   | plugin Fastify do módulo, rotas, handlers, schemas Zod por rota              |

- **Nenhuma rota, handler ou schema de feature vive no shell transversal.** `src/shared/http/` é agnóstico de domínio.
- **`src/server.ts` só importa plugin de módulo via `<m>/public-api/http.ts`** — nunca de `<m>/domain/` ou `<m>/application/` (ADR-0006).

## Validação — duas camadas, e a sobreposição é intencional ([ADR-0027](../../handbook/architecture/adr/0027-zod-openapi-contract-first-http-edge.md))

```
request → Zod (shape) → smart constructor (regra) → use case → Result → HTTP
```

- **Zod valida o envelope** (JSON bem-formado, campos, tipos primitivos), serializa a resposta e gera o OpenAPI. Shape inválido → **400 antes do use case**.
- **Smart constructors validam invariante de negócio** (`Email`, `Money`…) e retornam `Result<T,E>` → 4xx.
- ⚠️ **O mesmo campo ser tocado nas duas camadas é deliberado** — o ADR-0027 diz literalmente _"É intencional, não DRY-violation"_. **Não "limpe" essa duplicação**: remover o schema Zod derruba o 400 cedo e entrega `unknown` cru ao domínio.

## Fronteira do Zod

- **Zod vive exclusivamente em `src/modules/*/adapters/http/` e `src/shared/http/`.** Domínio e application **nunca** o importam — se importarem, a lógica de negócio fica acoplada ao framework (ADR-0025, ADR-0027).
- Hoje há **zero violações**, mantidas por disciplina. Não há regra de lint que barre.

## OpenAPI

- **Gerado dos schemas Zod, nunca escrito à mão.** Alvo **3.1.1** — `zod-openapi` suporta apenas 3.1.0/3.1.1 (3.0.x e 3.2.0 fora).
- O `openapi.yaml` legado é referência de migração/ACL, **não** contrato vivo.

## Versionamento por recurso ([ADR-0033](../../handbook/architecture/adr/0033-api-versioning-v1-legacy-mirror.md))

| Prefixo   | Significado                                             | Recursos hoje         |
| --------- | ------------------------------------------------------- | --------------------- |
| `/api/v1` | Espelha o legado — contrato **congelado**, só correção  | Colaboradores (`partners`) |
| `/api/v2` | Modelo novo (greenfield). **Default** do `buildApp`      | `auth`, `contracts`   |

- A versão é **por recurso**, nunca global. `{ plugin, prefix: '/api/v1' }` registra em v1; plugin direto ou sem `prefix` cai no default `/api/v2`.
- Recurso v1 redesenhado ganha **contraparte v2** — o contrato v1 **não muta**. Aposentadoria segue `Sunset` (RFC 8594).

## Composição de leitura na borda ([ADR-0032](../../handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md))

Rota que compõe visão rica vive na borda e é **transitória até o BFF v2 assumir**.

- **Cross-módulo só por `public-api`** — nunca `SELECT` em tabela de outro módulo (ADR-0006/0014).
- Toda rota composta nasce marcada: `@transient`/`@deprecated` no handler, headers `Deprecation`/`Sunset`, nota no OpenAPI. Dívida com data de validade, não escondida.
- **A linha que decide onde o campo entra:** dado que vem de **outro módulo** → composição na borda; atributo **do próprio agregado** (`classification`, `contractModel`, `observations`) → evolui o domínio. Modelagem legítima não é corrupção.

## Fastify ([ADR-0025](../../handbook/architecture/adr/0025-http-server-fastify-core-api.md))

- A borda é **adapter**: traduz `Result<T,E>` em status HTTP. `throw` é permitido **aqui**, convertido antes de cruzar a borda.
- **Não duplicar o BFF.** O BFF continua burro (ADR-0005 **não** é superseded): roteia, valida JWT, rate limit. Quem tem a regra e emite credencial é o core-api.
- Logging estruturado (Pino) com `request-id` propagado.

## Especialistas

[`fastify-server-expert`](../agents/fastify-server-expert.md) para a borda · [`zod-expert`](../agents/zod-expert.md) revisa os schemas — sempre em par.

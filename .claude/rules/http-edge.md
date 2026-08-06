---
paths:
  - 'src/shared/http/**/*.ts'
  - 'src/modules/*/adapters/http/**/*.ts'
  - 'tests/modules/*/adapters/http/**/*.ts'
  - 'src/server.ts'
verify:
  - claim: 'o prefixo de versão é decidido só no composition root'
    root: 'src'
    pattern: "prefix: '/api/v1'"
    expect:
      - 'src/server.ts'
---

A borda HTTP é a **UX primária** ([ADR-0037](../../handbook/architecture/adr/0037-http-first-retire-embedded-cli.md)). A fronteira do Zod e o isolamento do shell transversal são cobrados por `tests/cleanup/http-edge-boundary.test.ts`; o glob de borda no `eslint.config.js` apenas **afrouxa** regras para os tipos do Fastify — não impõe nada.

## Onde cada coisa mora ([ADR-0028](../../handbook/architecture/adr/0028-http-edge-shell-location.md))

| Responsabilidade | Local | Conteúdo |
| --- | --- | --- |
| Shell transversal | `src/shared/http/` | `buildApp`, error handler/envelope, `sendResult` (Result→HTTP), config, OpenAPI |
| Composition root | `src/server.ts` | lê env, monta deps, `buildApp({ routes })`, `listen`, shutdown |
| HTTP da feature | `src/modules/<m>/adapters/http/` | plugin Fastify, rotas, handlers, schemas Zod por rota |

`src/server.ts` importa plugin de módulo **só** por `<m>/public-api/http.ts` — nunca de `domain/` ou `application/` (ADR-0006).

## A dupla validação é deliberada ([ADR-0027](../../handbook/architecture/adr/0027-zod-openapi-contract-first-http-edge.md))

```
request → Zod (shape) → smart constructor (regra) → use case → Result → HTTP
```

Zod valida o **envelope** (JSON bem-formado, campos, tipos primitivos), serializa a resposta e gera o OpenAPI 3.1.1 — shape inválido vira **400 antes do use case**. Smart constructors validam **invariante de negócio** e devolvem `Result` → 4xx.

⚠️ **O mesmo campo ser tocado nas duas camadas é intencional** — o ADR-0027 diz literalmente _"É intencional, não DRY-violation"_. **Não "limpe" essa duplicação:** remover o schema Zod derruba o 400 cedo e entrega `unknown` cru ao domínio. É a afirmação desta rule com maior chance de ser desfeita por quem acha que está melhorando o código.

## Versionamento é por recurso, nunca global ([ADR-0033](../../handbook/architecture/adr/0033-api-versioning-v1-legacy-mirror.md))

A forma do registro decide o prefixo: `{ plugin, prefix: '/api/v1' }` vai para v1; **plugin direto** cai no default `DEFAULT_API_PREFIX = '/api/v2'` (`src/shared/http/app.ts`).

| Prefixo | Significado | Quem está lá hoje |
| --- | --- | --- |
| `/api/v1` | espelha o legado — contrato **congelado**, só correção | `partners` (collaborators, suppliers, financiers, geography, act, partners), `programs`, e **4 plugins do `auth`**: users, approvers, roles, me |
| `/api/v2` | modelo novo (greenfield) | `auth` (login/token), `contracts`, `financial`, `budget-plans`, `reports`, suppliers:batch |

**O módulo `auth` vive nos dois** — autenticação em v2, gestão administrativa de usuários em v1. Não existe "módulo v1" nem "módulo v2": a unidade é o recurso. Recurso v1 redesenhado ganha contraparte v2 e o contrato v1 **não muta**; aposentadoria segue `Sunset` (RFC 8594).

## Composição de leitura na borda ([ADR-0032](../../handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md))

Rota que compõe visão rica vive na borda e é **transitória até o BFF assumir**. Cross-módulo só por `public-api` — nunca `SELECT` em tabela alheia. Toda rota composta nasce marcada (`@transient`/`@deprecated` no handler, headers `Deprecation`/`Sunset`, nota no OpenAPI): dívida com data de validade, não escondida.

**A linha que decide onde o campo entra:** dado que vem de **outro módulo** → composição na borda; atributo **do próprio agregado** (`classification`, `contractModel`, `observations`) → evolui o domínio. Modelagem legítima não é corrupção.

## Fastify ([ADR-0025](../../handbook/architecture/adr/0025-http-server-fastify-core-api.md))

A borda é adapter: traduz `Result<T, E>` em status HTTP, e `throw` é permitido **aqui**, convertido antes de cruzar para dentro. Logging estruturado (Pino) com `request-id` propagado. **Não duplicar o BFF** — mas "burro" significa **sem regra de negócio**, não sem composição ([ADR-0059](../../handbook/architecture/adr/0059-bff-aggregates-without-business-rules.md), supersessão parcial do ADR-0005). O BFF agrega chamadas e monta view-model por tela; o que ele **MUST NOT** ter é invariante de domínio ou validação de escrita. Quem tem a regra e emite credencial é o core-api — e o core **não afrouxa contando com o BFF**: o [ADR-0049](../../handbook/architecture/adr/0049-core-api-bff-boundary.md) fixa que o core é público em definitivo, então authz e multi-tenant são defesa permanente, não ponte até uma rede privada que não virá.

Borda: [`fastify-server-expert`](../agents/fastify-server-expert.md) · schemas: [`zod-expert`](../agents/zod-expert.md) — sempre em par.

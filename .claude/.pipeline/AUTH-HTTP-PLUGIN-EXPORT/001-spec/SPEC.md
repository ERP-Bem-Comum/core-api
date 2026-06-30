# SPEC — Expor o plugin Fastify do `auth` via `public-api/http.ts` (`AUTH-HTTP-PLUGIN-EXPORT`)

> **Tipo:** ticket · **Size:** S · **Épico-pai:** `EPIC-HTTP-CORE-API`
> **Status da spec:** aprovada (2026-05-28, Gabriel)
> **ADRs tocados:** `ADR-0006`, `ADR-0025`, `ADR-0027`, `ADR-0005`

## 1. Problema & contexto

O H0 (`CORE-HTTP-FASTIFY-BOOTSTRAP`, closed-green) entregou `buildApp({ routes })` recebendo plugins de
rota **por injeção** — `buildApp` não importa módulo nenhum (ADR-0006). Falta agora o módulo `auth` ter um
**ponto público** que exporte seu plugin HTTP, para que o composition root (`server.ts`) o registre sem
importar de `auth/domain/` ou `auth/application/`. Sem esse mecanismo, o H1 (rotas reais) não tem onde
pendurar nada sem ferir o isolamento modular. Este ticket entrega só o **mecanismo de exposição** + uma
rota sentinela que prova o wiring ponta-a-ponta e serve de template Zod para o H1.

## 2. User stories

- Como **composition root** (`server.ts`), quero importar o plugin HTTP do `auth` de um ponto público
  (`public-api/http.ts`), para registrá-lo em `buildApp` sem violar o ADR-0006.
- Como **autor das rotas do H1**, quero um plugin de módulo já encapsulado sob `/api/v2/auth` com um
  exemplar Zod contract-first, para só declarar as rotas reais seguindo o template.

## 3. Critérios de aceitação (viram os testes do W0 — via `app.inject`)

- **CA1 (wiring)** — `buildApp({ routes: [authHttpPlugin] })` resolve; `inject GET /api/v2/auth/__ping`
  → **200** com body `{ pong: true }`.
- **CA2 (é o plugin que monta a rota)** — `buildApp({ routes: [] })` (sem o plugin); `inject GET
  /api/v2/auth/__ping` → **404** com envelope estável `{ error: { code: 'not-found', message, requestId } }`.
- **CA3 (contract-first, ADR-0027)** — com o plugin registrado, `inject GET /docs/json` → **200** e o
  documento OpenAPI contém a chave de path `/api/v2/auth/__ping`.
- **CA4 (encapsulamento Fastify)** — com o plugin registrado: `inject GET /__ping` (na raiz) → **404**
  (a rota só existe sob `/api/v2/auth`), e `inject GET /health` → **200** `{ status: 'ok' }` (o plugin
  não quebra nem polui o boot transversal).
- **CA5 (ADR-0006)** — `import { authHttpPlugin } from '#src/modules/auth/public-api/http.ts'` resolve e
  `typeof authHttpPlugin === 'function'` (é um `FastifyPluginAsync`). Esse é o único caminho público de
  acesso ao plugin.

## 4. Não-objetivos / fora de escopo

- Rotas reais (`register/login/refresh/logout`) e wiring de use cases/repos/JWT/hasher → **H1**.
- preHandler authn + `authorize(permission)` → **H2**.
- Dual pool writer/reader (ADR-0026) → **I1**.
- Re-exportar `authHttpPlugin` no barrel `public-api/index.ts` (mantido isolado em `http.ts` — ver §5).
- A rota `__ping` **não** é endpoint de produção; é sentinela que o H1 remove.

## 5. Clarificações (Q&A resolvidas)

- **Q:** Por que `public-api/http.ts` separado do barrel `public-api/index.ts`? · **R:** O `index.ts`
  exporta o contrato de domínio/eventos do módulo (consumido por outros módulos sem framework). Arrastar
  `import` de Fastify para esse barrel acoplaria todo consumidor de eventos ao Fastify. `http.ts` é a
  borda HTTP do módulo, importada **só** pelo composition root. Separação alinhada ao comentário já
  presente em `server.ts:4-5` ("via `<modulo>/public-api/http.ts`"). (2026-05-28, decisão de design.)
- **Q:** Plugin vazio ou com rota? · **R:** Rota **sentinela** `__ping` com response schema Zod — torna
  o wiring observável por `inject` (CA1-CA4) e materializa o padrão contract-first que o H1 replica 4x.
  Plugin literalmente vazio não seria testável de forma significativa (só "não lança"). Alinhado ao
  preview aprovado pelo usuário ("rota dummy"). (2026-05-28, Gabriel.)
- **Q:** O sub-prefixo `/auth` fica no plugin ou no root? · **R:** No **plugin** (encapsulamento Fastify):
  o plugin registra suas rotas relativas e aplica `prefix: '/auth'` internamente; `buildApp` aplica
  `/api/v2`. Resultado: `/api/v2/auth/*`. Mantém o módulo dono do seu namespace. (2026-05-28.)

## 6. Plano técnico de alto nível (sem código)

```
src/modules/auth/
  adapters/http/
    plugin.ts        — authHttpPlugin: FastifyPluginAsync
                        · usa o type-provider Zod já instalado no app (FastifyZodOpenApiTypeProvider)
                        · register de um sub-plugin/escopo com prefix '/auth'
                        · GET /__ping → 200 { pong: true } com response schema Zod ({ pong: z.literal(true) })
                        · SEM import de domain/application (rota sentinela não toca use case)
  public-api/
    http.ts          — export { authHttpPlugin } from '../adapters/http/plugin.ts'
                        (NÃO re-exporta no index.ts; http.ts é o ponto público da borda HTTP)

src/server.ts        — import { authHttpPlugin } from '#src/modules/auth/public-api/http.ts'
                        buildApp({ routes: [authHttpPlugin], config })   (troca routes: [] → [authHttpPlugin])
                        (composition root na raiz — ADR-0028)
```

- **Encapsulamento:** o `authHttpPlugin`, ao ser registrado por `buildApp` sob `/api/v2`, monta sua rota
  sob `/api/v2/auth` sem vazar hooks/decorators para a instância raiz (garantia de escopo do Fastify).
- **Contract-first:** o response schema Zod da rota sentinela entra no OpenAPI gerado (`/docs/json`),
  provando que rotas de módulo participam do contrato (CA3). Zod fica **só** em `adapters/http/`.
- **Reuso:** nenhum port novo; nenhuma dep nova (Fastify + Zod stack já instalados no H0).
- **Config ESLint:** o override de borda HTTP **já cobre** `src/modules/*/adapters/http/**/*.ts` (estendido
  pelo `CORE-HTTP-SHELL-RELOCATE`/ADR-0028, junto de `src/shared/http/**`). O plugin novo herda as folgas de
  adapter (`prefer-readonly-parameter-types`, `promise-function-async`, `require-await` off) sem mexer no config.

## 7. Constitution check (aderência aos ADRs/regras)

| Fonte | Exigência (citada) | Como a spec adere |
| :-- | :-- | :-- |
| `ADR-0006` | cross-módulo só via `public-api/`; nunca importar `domain/`/`application/` de outro módulo | `server.ts` importa o plugin **só** de `auth/public-api/http.ts` (CA5); `buildApp` segue recebendo por injeção, sem importar módulo |
| `ADR-0025:29-30` | HTTP é adapter; domínio/application sem framework | Plugin vive em `auth/adapters/http/`; nenhum Fastify/Zod entra em `auth/domain` ou `auth/application` |
| `ADR-0025:35` | rotas de negócio sob `/api/v2/*` | `buildApp` aplica `/api/v2`; o plugin aplica `/auth` → `/api/v2/auth/*` |
| `ADR-0027` | Zod só na borda; OpenAPI **gerado**, não à mão | Rota sentinela com response schema Zod entra no `/docs/json` gerado (CA3); Zod só em `adapters/http/` |
| `ADR-0005:31` | BFF burro; core-api emite, BFF valida | Sentinela não autentica; authn é H2 |
| `.claude/rules/contracts-module.md` | `public-api/` é o único ponto de import externo do módulo | Espelha o padrão em `auth` com `http.ts` dedicado à borda HTTP |

## 8. Riscos & mitigações

| Risco | Severidade | Mitigação |
| :-- | :-- | :-- |
| Sentinela `__ping` vazar para produção | baixa | Nome `__ping` (sentinela explícita); H1 a remove ao adicionar rotas reais; documentado em §4 |
| `buildApp` acabar importando `auth` direto (fere ADR-0006) | média | CA5 + import exclusivo via `public-api/http.ts`; W2 audita o import path em `server.ts` |
| Plugin vazar hooks/decorators para a raiz | baixa | Encapsulamento Fastify (escopo do plugin); CA4 asserta `/health` intacto e `/__ping` na raiz = 404 |
| Acoplar consumidores de eventos ao Fastify via barrel | baixa | `http.ts` separado de `index.ts` (§5); barrel não importa Fastify |

## 9. Definition of Done

- [ ] CA1–CA5 cobertos por teste (W0) e verdes (W3).
- [ ] `server.ts` registra `authHttpPlugin` importado de `public-api/http.ts` (não de `adapters/`).
- [ ] `pnpm test` + `typecheck` + `format:check` + `lint` verdes (W3).
- [ ] Nenhum import de Fastify/Zod fora de `src/shared/http/` e `src/modules/*/adapters/http/`.
- [ ] Constitution check sem conflito aberto.

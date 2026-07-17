# W1 — Implementação (ADR-0052)

> Agente: `fastify-server-expert` · Resultado: **GREEN**.

## Arquivos

| Arquivo | O quê |
| :--- | :--- |
| `adapters/http/rbac-mode.ts` | **novo** — `resolveRbacMode(env)` (fail-secure) |
| `adapters/http/composition.ts` | `+rbacMode` no config; bypass nos **2** pontos (`authorize`/`hasPermission`) |
| `public-api/http.ts` | exporta `resolveRbacMode`/`RbacMode` (ADR-0006) |
| `server.ts` | lê `AUTH_RBAC_MODE` + **banner de boot** quando bypass |

## O ponto único

O bypass vive só na composição, nos dois hooks que **todos** os módulos consomem via
`buildAuthHttpDeps`:

```ts
authorize: (name) => rbacMode === 'bypass' ? async () => undefined : makeAuthorize(...)(parse(name)),
hasPermission: rbacMode === 'bypass' ? async () => true : makeHasPermission(...),
```

Nenhum plugin de módulo mudou — herdam por injeção. O domínio (`authorize`, `Role.hasPermission`)
**não foi tocado**: o RBAC continua correto, só não é chamado no modo bypass. `requireAuth` fica fora
disso (autenticação intacta).

Detalhe deliberado: a **validação do nome da permissão** (`Permission.parse` → throw no wiring)
permanece mesmo no bypass. Um nome inválido é bug de código; deve estourar no boot em qualquer modo,
não ser mascarado pelo bypass.

## Fail-secure (o guarda do ADR-0052)

`resolveRbacMode` liga **só** com a palavra exata `'bypass'`. Verificado:

```
{}              → enforced      '1'    → enforced     'true'  → enforced
AUTH_RBAC_MODE=bypass → bypass  'BYPASS' → enforced   ' bypass' → enforced
```

Um typo de env, ou um `=1`/`=true` copiado de outra flag, **nunca** abre a autorização. É o oposto do
fallback silencioso dos #456/#462/#474.

## Banner de boot (CA8) — não-silencioso

`AUTH_RBAC_MODE=bypass NODE_ENV=production` no boot emite em stderr:

```
################################################################
#  ⚠️  AUTORIZAÇÃO RBAC DESLIGADA (AUTH_RBAC_MODE=bypass)       #
#  TODO USUÁRIO AUTENTICADO É SUPER-USUÁRIO.                    #
#  NODE_ENV=production                                        #
#  A autenticação segue ativa; só a permissão por rota caiu.   #
#  Reversível: remova a env ou use AUTH_RBAC_MODE=enforced.     #
################################################################
```

No modo `enforced` (default) o boot é silencioso — a flag não polui a operação normal.

## Prova de comportamento (borda, módulo real)

`rbac-bypass.routes.test.ts` liga o `authDeps.authorize` (bypass) ao `budgetPlansHttpPlugin` e usa um
usuário só com `budget-plan:read` numa rota de **escrita**:

| Caso | enforced | bypass |
| :--- | :--- | :--- |
| criar plano (exige `write`) | **403** (CA5) | **201** (CA4) |
| sem token | 401 | **401** (CA6 — auth intacta) |
| rota subsequente (add budget) | — | **201** (CA7 — o `hasPermission` também bypassa) |

O CA7 é o que garante que os **dois** pontos foram cobertos: se só o preHandler bypassasse, as rotas
do `partners` com autorização condicional continuariam barrando.

## Regressão zero

`pnpm test` → **4179 testes, fail 0** (baseline 4163 + 16). Os testes de RBAC existentes (que esperam
403 para usuário sem permissão) **seguem verdes** — rodam em `enforced`, o default. Nada regride.

## Gate

`typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `pnpm test` ✓.

## Próxima wave

**W2** — `security-backend-expert`. Pontos a esticar: o bypass vaza para algum caminho que
**escreve** sem passar por `authorize` (ex.: rotas sem preHandler)? A validação de nome de permissão
no bypass é intencional? O banner é suficiente ou falta um sinal por-request/health?

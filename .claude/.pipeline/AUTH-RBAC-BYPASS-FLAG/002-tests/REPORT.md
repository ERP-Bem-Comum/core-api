# W0 — Testes RED (ADR-0052)

> Agente: `tdd-strategist` · Resultado: **RED** · 2 arquivos, 15 casos.

## Arquivos

| Arquivo | CAs | Camada |
| :--- | :--- | :--- |
| `rbac-mode.test.ts` | CA1/CA2/CA3 | unit (resolver puro, fail-secure) |
| `rbac-bypass.routes.test.ts` | CA4/CA5/CA6/CA7 | borda (`fastify.inject`, módulo real) |

## RED

- `resolveRbacMode` não existe → `ERR_MODULE_NOT_FOUND` (11 casos do resolver).
- **CA4** (bypass libera a escrita) e **CA7** (bypass libera rota subsequente) **falham com 403**: o
  `rbacMode: 'bypass'` passado ao `buildAuthHttpDeps` é hoje **ignorado** (o campo nem existe no
  tipo), então o enforcement segue ativo. É o RED por comportamento.

## Os dois casos que JÁ passam — e por que é correto

- **CA5** (enforced → 403) e **CA6** (sem token → 401) passam no W0. Não é falso-verde: eles travam o
  **comportamento atual que não pode regredir**. O `enforced` é o default de fato hoje, e a
  autenticação já devolve 401. Servem de âncora: se o W1 quebrar o default ou a auth, eles caem.

## Fail-secure é o foco do resolver

O CA3 varre `['1', 'true', 'on', 'off', 'BYPASS', ' bypass', 'disabled', 'yes', 'no']` — **nenhum**
liga o bypass. Só a palavra exata `'bypass'`. É a invariante do ADR-0052 §Guardas: um typo de env
(ou um copy-paste de `=1`) **nunca** abre a autorização. Valor desconhecido → `enforced`.

## O bypass é provado num MÓDULO real, não num mock

O teste liga `authDeps.authorize` (modo bypass) ao `budgetPlansHttpPlugin` e usa um usuário só com
`budget-plan:read` numa rota de **escrita**. Assim exercita o ponto único de injeção de verdade — se
o bypass fosse aplicado só no preHandler e não no `hasPermission`, o CA7 (rota subsequente) pegaria.

## CA8 (banner de boot) — fora do teste automatizado

O banner de aviso vive no `server.ts` (entrypoint, não testado por unit). Será verificado
manualmente no W1/W3 rodando o boot com `AUTH_RBAC_MODE=bypass` e conferindo o stderr — registrado no
REPORT do W1.

## Próxima wave

**W1** — `fastify-server-expert` (borda/hooks). Adicionar `rbacMode` ao `AuthCompositionConfig`,
aplicar em `buildAuthHttpDeps`, o resolver, e o banner no `server.ts`.

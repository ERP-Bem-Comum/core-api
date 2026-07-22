# BGP-MEMORY-SEED-CATALOG — escopo (#330)

> No driver `memory`, o catálogo de programas do budget-plans nasce vazio → `POST /budget-plans` sempre
> 404 `program-not-found`. Destravar o caminho feliz local via `BUDGET_PLANS_SEED_JSON` (molde
> `AUTH_SEED_JSON`). Size **S**. Branch `feat/377-330-budget-plans-hardening`. Prioridade da P.O. (Bloco 1).

## Problema (#330)

Rodando local sem MySQL (`node src/server.ts` sem `BUDGET_PLANS_DRIVER=mysql`), o `ProgramCatalogPort` do
budget-plans é `InMemoryProgramCatalog([])` — vazio. Criar um Program via `POST /api/v1/programs` (memory)
não o torna visível (stores memory isolados por módulo). Todo `programRef` → 404 `program-not-found`. O
caminho feliz da fatia US1 (#315) é inacessível via HTTP local; smoke Bruno isolado como expected-fail
(`z-pending-fixes/budget-plans/`).

## Estado (Explore — quase tudo já existe)

- A composition **JÁ aceita** o seed completo: `BudgetPlansSeed` (`composition.ts:69-88`) tem
  `programs?`, `partnerStates?`, `partnerMunicipalities?`, `plans?`. O `buildMemoryPools` (`:173-200`) já
  injeta `InMemoryProgramCatalog(seed?.programs ?? [])` e `InMemoryPartnerNetwork({ states, municipalities })`.
- **O que falta:** o `server.ts` (`:230`) chama `buildBudgetPlansHttpDeps` mas **não lê env de seed** — no
  ramo memory nunca passa `seed`, então `programs`/`partnerStates` ficam `[]`.
- Molde pronto: `auth/adapters/http/e2e-seed.ts` (`parseE2eAuthSeed`) — guarda dupla `CORE_API_E2E==='1'` +
  `AUTH_SEED_JSON`; JSON malformado/shape inválido sob a flag → **erro de boot** (falha cedo, dev/test).
  O `server.ts:110` já usa `parseE2eAuthSeed(process.env)`.

## Escopo (in) — 2 pontos (o resto já existe)

1. **`budget-plans/adapters/http/e2e-seed.ts` (novo)** — `parseE2eBudgetPlansSeed(env)`, espelho do
   `parseE2eAuthSeed`: retorna `BudgetPlansSeed | undefined`; só ativo com `CORE_API_E2E==='1'` E
   `BUDGET_PLANS_SEED_JSON` presente; `JSON.parse` (SyntaxError em malformado) + type guards validando o
   shape (`programs[]` com `{ ref, name, abbreviation, active }`, `partnerStates[]`/`partnerMunicipalities[]`
   com `{ ref, name, uf }`, `plans?`); shape inválido sob a flag → `throw` (CA3).
2. **`server.ts`** — no ramo do budget-plans: `const budgetPlansSeed = parseE2eBudgetPlansSeed(process.env)`
   e, quando driver memory, passar `seed: budgetPlansSeed` ao `buildBudgetPlansHttpDeps` (molde do
   `authSeed`). Em driver mysql, ignorado (lê `prg_*` real). Boot falha explícito em malformado (o `throw`
   propaga; ou capturar e `process.exit` com log, como o `emailLinkUrls` em `:122-125` — seguir o padrão do
   arquivo).

## Fora de escopo

- Promover a coleção Bruno `z-pending-fixes/budget-plans/` (CA4) — é mover arquivos `.bru` + editar
  `bruno-all.sh`, não código do server. Fica como follow-up (registrar) OU incluir se trivial. Não bloqueia
  o destravamento do backend.
- Tocar o ramo mysql / `ProgramCatalogReadPort`. Nenhuma mudança de composition/InMemory (já aceitam o seed).

## Critérios de aceite (Dado/Quando/Então)

- **CA1** — Dado o server memory com `CORE_API_E2E=1` + `BUDGET_PLANS_SEED_JSON` contendo um programa ATIVO
  `{ref, name, abbreviation, active:true}` e ≥1 rede (state/municipality), Quando `POST /api/v2/budget-plans`
  com esse `programRef`, Então **201** com plano RASCUNHO v1.0.
- **CA2** — Dado o mesmo seed, Quando `GET /api/v2/budget-plans/options`, Então o programa aparece em
  `programs` e as redes em `redes`.
- **CA3** — Dado `BUDGET_PLANS_SEED_JSON` malformado (JSON inválido OU shape inválido) sob `CORE_API_E2E=1`,
  Quando o server sobe, Então **falha explícita de boot** (throw/exit com mensagem clara) — nunca seed
  silenciosamente ignorado.
- **CA4** — Dado `CORE_API_E2E` ausente (produção), Quando o server sobe, Então o seed é **inerte**
  (`parseE2eBudgetPlansSeed` devolve `undefined`) — nunca lido. Guarda dupla.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — unit do parser (guarda dupla, malformado→throw, shape válido→seed) + HTTP (`fastify.inject` com deps semeadas: POST 201 + GET options) |
| W1 | `fastify-server-expert` (par `zod-expert` no shape) + `nodejs-runtime-expert` (env/boot) | parser + wiring no server.ts |
| W2 | `code-reviewer` | audit read-only (guarda dupla; boot fail em malformado; molde AUTH) |
| W3 | `ts-quality-checker` | gate (sem MySQL — é driver memory; validação é `pnpm test`) |

## DoD

Gate W3 verde + CA1–CA4 + caminho feliz local destravado (POST budget-plans 201 no memory) + guarda dupla
+ boot fail em malformado. Fecha #330. (CA4 Bruno = follow-up.)

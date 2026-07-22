# Code Review — Ticket BDG-COST-STRUCTURE (#316) — W2 Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (consolidando 3 auditorias especialistas)
**Data:** 2026-07-08
**Escopo revisado (W1-B — Aplicação + Borda):**
- `application/use-cases/`: `get-cost-structure.ts`, `add-cost-center.ts`, `add-category.ts`, `add-subcategory.ts`
- `domain/cost-structure/repository.ts` (port `mutate` + `CostStructureMutation` + `CostStructureMutateError`)
- `adapters/persistence/repos/cost-structure-repository.{in-memory,drizzle}.ts`
- `adapters/http/`: `plugin.ts`, `schemas.ts`, `cost-structure-dto.ts`, `composition.ts`
- Testes: 4 use-case + `_cost-support.ts` + `cost-structure.routes.test.ts` + suíte de contrato estendida (`mutate`)

---

## (i) Verdictos dos 3 auditores especialistas + fixes aplicados

| Auditor | Área | Verdicto | Ação |
| :-- | :-- | :-- | :-- |
| `drizzle-orm-expert` | Persistência (`mutate` FOR UPDATE, helpers `selectTree`/`writeTree`, gating do teste integração) | **OK** | — |
| `fastify-server-expert` | Borda (rotas, RBAC, mapa erro→HTTP, ordem de rotas) | **OK** | 1 achado out-of-scope → issue #367 |
| `zod-expert` | Schemas Zod (contract-first, ADR-0027) | **CHANGES-REQUESTED** | 3 fixes aplicados ↓ |

### Fixes aplicados (in-scope, W2)

1. **Major — `.max(255)` no `name` dos 3 body schemas** (`adapters/http/schemas.ts`): `z.string().min(1).max(255)` (constante `NODE_NAME_MAX`), casando a coluna `varchar(255)`. Barra input ilimitado na borda antes de persistir. **Teste de fronteira adicionado** (`cost-structure.routes.test.ts`): `POST .../cost-centers` com `name` de 256 chars → **400** (Zod barra). Fail-first válido: sem o `.max`, o `min(1)` deixaria passar → 201.
2. **Minor — `.meta({ description })` nos 2 enums** (`costDirectionSchema`, `launchTypeSchema`): documentação OpenAPI.
3. **Minor — comentário do `mutate`** (`cost-structure-repository.drizzle.ts`): corrigido "rollback natural" (incorreto). Agora explica: retornar Result de erro do callback é retorno NORMAL → drizzle emite COMMIT **inócuo** (nenhum INSERT/UPDATE/DELETE rodou; o `SELECT ... FOR UPDATE` só leu); o único ROLLBACK real vem da EXCEÇÃO (status corrompido), capturada no catch.

---

## (ii) Issue registrada (achado out-of-scope)

**#367** — `[budget-plans] não vazar código interno de erro no body de respostas 5xx` (labels `agent-found,needs-triage,seguranca`; dedup-key `budget-plans:http:error-envelope-5xx`).
- **Causa-raiz:** `sendWriteError` (`plugin.ts:76-81`) chama `toErrorEnvelope(code, code, requestId)` sem guard de status, divergindo do `sendResult` (`shared/http/reply.ts:38-45`) que mascara 5xx com envelope `internal` e loga o code real. O novo `cost-structure-repo-unavailable` (503) herda; `budget-plan-repo-unavailable` etc. já sofriam.
- **Decisão:** NÃO corrigido agora (fora do escopo do #316 — anti-padrão #15/ADR-0040). Distinto de #52 (aquele era 4xx no financial, CLOSED). Registrado com CAs Dado/Quando/Então + patch sugerido + DoD amarrada ao W3.

---

## (iii) Achados próprios do code-reviewer

### 🔴 Crítica
Nenhuma.

### 🟡 Importante
Nenhuma.

### 🔵 Sugestão (não-bloqueante)

- **`composition.ts` `seedPlans`** constrói `BudgetPlanEntity` diretamente (bypass do agregado `BudgetPlan.create`). **Justificado e aceito:** é caminho de seed test/dev na camada de adapter (não domínio), e o agregado só nasce `RASCUNHO` — semear `APROVADO` para exercitar CA3 na borda exige este bypass. Documentado no código. Sem ação.
- **In-memory `mutate` default `NO_PLAN`** (readPlanStatus → sempre `null`): footgun teórico se alguém instanciar o repo sem `readPlanStatus` e esperar que `mutate` funcione. **Aceito:** default documentado, mantém verde a suíte W1-A (só usa save/find); a composition sempre injeta o `readPlanStatus` derivado do `planRepo`. Sem ação.

---

## Checklist de conformidade (verificado)

**A. Domínio** — port `cost-structure/repository.ts` é só `type Readonly<{...}>`; zero `throw`/`class`/`any`/`new Date` cruzando borda. **B/C.** N/A (sem VO/union novos nesta fatia — reusa os do W1-A). **D. Ports & Adapters** — use cases são factory `(deps)=>(cmd)=>Promise<Result>`; `Deps` é `Readonly<>`; sequência validar→fetch→domain→persist respeitada (`get`: rehydrate→planRepo.findById→findByBudgetPlanId; `add*`: rehydrate→mutate); adapters convertem `throw`→`Result` na borda (os 2 `throw` do drizzle são capturados por `safe`/try-catch → `cost-structure-repo-unavailable`); in-memory presente para todos os ports. `ClockReal` na composition, sem `new Date` na application. **E. Modular Monolith** — cross-módulo só via `#src/modules/{programs,partners}/public-api/` (ADR-0006); sem leitura cross-prefixo `fin_*`. **F. ESM/TS** — imports `.ts`, `import type` nos type-only, sem `require`/`enum`/`namespace` (os `import * as` são module-as-namespace, house style). **G. Idioma** — identificadores EN; erros kebab EN; sem PT no código. **H. Testes** — AAA claro, fakes injetáveis (repo in-memory + status stub), UUIDs válidos, asserções por regra (não só "não lança"); `mutate` testado nos dois backends (drizzle gated).

---

## Audit log

```
$ pnpm run typecheck
$ tsc --noEmit
  → 0 erros

$ pnpm run format:check
$ prettier --check .
  All matched files use Prettier code style!

$ pnpm run lint
$ eslint .
  → 0 problemas

$ pnpm test
ℹ tests 3579
ℹ suites 1040
ℹ pass 3561
ℹ fail 0
ℹ cancelled 0
ℹ todo 0
  (cost-structure isolado: 41 pass; drizzle-mysql mutate corretamente GATED por MYSQL_INTEGRATION)
```

---

## (iv) Veredito final

**APPROVED** (round 1). Os 3 fixes do `zod-expert` foram aplicados e cobertos por teste de fronteira; persistência e borda aprovadas pelos especialistas; achado out-of-scope registrado (#367) sem scope-creep; zero achado 🔴/🟡 do code-reviewer. Gates todos verdes.

## Próximo passo

- Fiscal re-fiscaliza e fecha o **W2** no `STATE.json` (não tocado por esta sessão).
- **W3** (`ts-quality-checker`) — gate final formal já pré-validado verde aqui.
- **Integração x99** — `cost-structure.drizzle-mysql.test.ts` com `MYSQL_INTEGRATION=1` (FOR UPDATE real + auditoria SQL do `mysql-database-expert`).

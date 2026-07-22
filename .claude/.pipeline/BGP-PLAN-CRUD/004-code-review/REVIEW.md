# Code Review — Ticket BGP-PLAN-CRUD — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-02
**Escopo revisado:** `src/modules/budget-plans/**` (domain, application, adapters http/persistence/catalog/network, public-api), `src/modules/programs/{application/ports/program-catalog-read.ts, adapters/persistence/repos/program-catalog-read.drizzle.ts, public-api/read.ts}`, `src/modules/partners/{application/ports/geography-read.ts, adapters/persistence/repos/geography-read.drizzle.ts, public-api/read.ts}`, `src/modules/auth/domain/authorization/permission-catalog.ts`, `src/server.ts`, `src/jobs/migrate/run.ts`, `src/jobs/financial/payable-view-backfill/reader.ts`, migration `0000_free_lady_deathstrike.sql`, `db/drizzle/budget-plans.ts`, `package.json`, testes novos (`tests/modules/budget-plans/**`, âncora do catálogo, backfill). Greps mecânicos: throw/class/this/any/push/sort/new Date() no domínio+application; imports cross-módulo.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

#### Issue 1 — `src/modules/budget-plans/adapters/http/plugin.ts:76-81`
**Categoria:** G/segurança (convenção transversal).
`sendWriteError` devolve o código interno cru em respostas 503 e não loga server-side —
diverge do contrato de `src/shared/http/reply.ts` (`sendResult` redige ≥500 e loga). É
**cópia fiel** do padrão de `programs`/`partners` (convenção pré-existente em 3 módulos),
logo não é regressão deste ticket. **Ação:** registrar GitHub Issue transversal
(via skill `issue-report`), junto com `page` sem `.max()` (mesma natureza, achado m2 do
zod-expert). Não consertar aqui (anti-padrão #15, scope-creep).

#### Issue 2 — `src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts:46-53`
**Categoria:** D. Linha corrompida no banco (`budget-plan-mapper-*`) vira `throw` interno
capturado pelo `safe()` → `budget-plan-repo-unavailable` (503). Fail-closed correto e o
código específico fica no stderr; mas o erro tipado do mapper não chega ao chamador.
Aceitável (mesma escolha do `geography-read.drizzle.ts`); registrado como observação para
quando houver telemetria estruturada.

### 🔵 Sugestão (estilo / clareza)

1. `mappers/budget-plan.mapper.ts:33-50` e `repos/budget-plan-repository.drizzle.ts:41,71,86` —
   `as unknown as string` para "desbrandar" refs é desnecessário (`Brand<string, K>` é
   atribuível a `string` por interseção); `String(x)` ou atribuição direta bastam. Está em
   adapter (não fere §3.A.2, que é sobre domínio), mas o cast duplo é mais forte do que o
   necessário. Limpar numa oportunidade futura.
2. Migration `bgp_budgets.value_cents` sem `CHECK (value_cents >= 0)` — defesa em
   profundidade opcional (o VO Money já garante; `fin_*` também não tem em todo lugar).
3. `PlanVersion.initial()` como função em vez de constante `INITIAL` (DON'T B§10 é sobre
   identidade imutável) — contrato fixado pelo W0; cosmético.

---

## Checklist (resultado)

- **A (domínio):** zero throw/class/this/any; `Readonly<>` em tudo; arrays `readonly`;
  return types explícitos; eventos com `occurredAt` injetado ✅ (greps limpos).
- **B (smart constructors):** IDs/refs com `rehydrate` retornando Result; cast único no
  smart constructor; Money reusado do kernel ✅.
- **C (unions):** `BudgetPartner` discriminada por `kind`; sem optional-como-variante ✅.
- **D (ports/adapters):** ports `type Readonly<{}>`; use cases factory `(deps)=>(input)=>Promise<Result>`;
  eventos gravados na MESMA transação do save (outbox, ADR-0015) — mais forte que
  "publish após save" ✅; todo port com InMemory ✅; throws convertidos na borda (`safe()`,
  try/catch nos read stores) ✅; boot-throw no composition = precedente programs ✅.
- **E (modular monolith):** cross-módulo APENAS via `public-api` (grep limpo); extensões
  em programs/partners são ports read-only segregados (ISP, precedente #207); prefixo
  `bgp_` exclusivo (ADR-0014) ✅.
- **F (ESM/TS):** imports com `.ts`; `import type`; sem require/namespace/enum;
  typecheck zero ✅.
- **G (idioma/naming):** código EN; erros EN kebab; evento `BudgetPlanCreated` (EN passado);
  status `RASCUNHO|EM_CALIBRACAO|APROVADO` são **valores de fio** portados do legado
  (precedente `ProgramStatus` ATIVO/INATIVO — não é identificador PT) ✅.
- **H (testes):** fakes injetáveis (sem mocks); UUIDs v4 válidos; suite parametrizada
  consumida por inmemory (gate) + drizzle-mysql (gated `MYSQL_INTEGRATION`); asserções de
  regra (409 duplicado, invariante 1-por-parceiro, soma = total) ✅.
- **SQL (ADR-0018/0020):** varchar+CHECK (sem ENUM), bigint cents, UUID varchar(36)
  utf8mb4_bin, FK CASCADE, sem AUTO_INCREMENT em PK, charset/collation manual ✅.

## O que está bom

- Reidratação do agregado 100% via smart constructors no mapper (zero shotgun parsing).
- `save` transacional com `SELECT ... FOR UPDATE` + replace integral dos filhos + outbox
  atômico — modelo limpo para as Fatias 3-4.
- `listPaged` evita N+1 (batch `IN` dos budgets da página).
- Decisão consciente de portas segregadas (`ProgramCatalogReadPort`,
  `PartnerGeographyReadPort`) em vez de inflar views existentes — não quebrou nenhum
  consumidor (fakes de contracts/financial constroem `ProgramView`).
- Gap de identidade Rede (UUID de domínio × chave natural do partners) detectado e
  documentado para a Fatia 3 em vez de resolvido às pressas.
- Regressões pré-existentes (backfill dessincronizado, âncora do catálogo) corrigidas na
  causa, não suprimidas.

## Próximo passo

**APPROVED** — pipeline-maestro avança para W3. Pendências registráveis: issue transversal
(Issue 1 + m2) via `issue-report` no fechamento.

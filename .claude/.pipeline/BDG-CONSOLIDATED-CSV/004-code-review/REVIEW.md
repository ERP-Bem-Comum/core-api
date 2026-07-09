# Code Review — BDG-CONSOLIDATED-CSV (#319, US5) — Round 1

**Veredito:** REJECTED (round 1, 1 Blocker) → **CORRIGIDO** (Blocker + todos os minors endereçados; gates verdes) → **APPROVED**.

**Reviewers:** `code-reviewer` (core, inline) + `drizzle-orm-expert` (query) + `zod-expert` (schemas) + `fastify-server-expert` (rotas). **Data:** 2026-07-09.

---

## 🔴 BLOCKER (drizzle-orm-expert) — versão ERRADA no consolidado após recalibração → CORRIGIDO

`listApprovedRoots` filtrava `parentId IS NULL AND status='APROVADO'` (as raízes). Mas a promoção da US4 é
semântica-limpa: aprovar o filho **não rebaixa o pai** (`approve-budget-plan.ts` só marca o plano achado). Logo,
pós calibração→aprovação, a família tem **raiz APROVADA (histórica)** + **filho APROVADO (vigente)**, e a query
devolvia a raiz → o Consolidado ABC reportaria o **total da versão antiga**, silenciosamente. Corrupção de
relatório financeiro (CA1 + CA2).

**Decisão Gabriel (2026-07-09):** Consolidado agrega a **vigente** (maior versão aprovada por família).

**Correção aplicada:**
- Novo helper puro de domínio `selectCurrentApprovedByFamily` (`domain/budget-plan/current-approved.ts`) — max
  versão APROVADA por família (year × programRef); maior major vence, empate → maior minor. Unit-testado (4 casos).
- Port `listApprovedRoots` → **`listApprovedByYear`** (retorna TODOS os aprovados do ano, raiz E filhos; sem
  filtro de raiz). Adapters drizzle + in-memory atualizados.
- `getConsolidatedResult` + `getConsolidatedExport` chamam `listApprovedByYear` → `selectCurrentApprovedByFamily`.
- Teste W0 `get-consolidated-result` reescrito: filho v2.0 (150k) vence raiz v1.0 (100k) → consolidado mostra 150k/v2.
- `getConsolidatedExport` test: 2 famílias distintas (ETI+PARC) → 2 seções (antes seedava 3 na MESMA família).

## 🟡 Major (drizzle) — índice de cobertura de `listApprovedByYear` → FOLLOW-UP (não implementado)

WHERE `year=? AND status='APROVADO' [AND program_ref=?]` sem índice composto. Recomendação: `(year, status)` ou
`(year, program_ref, status)` — **exige EXPLAIN em dado real antes de aplicar** (rota `mysql-database-expert`).
Tabela de baixa cardinalidade (planos/ano); scan pontual aceitável hoje. **Registrar como follow-up**, não bloqueia.

## 🔵 Minors — todos endereçados

- **(drizzle) DRY** hidratação em lote duplicada `listPaged`×`listApprovedByYear` → extraído helper `hydrateWithBudgets`. ✅
- **(drizzle) `localeCompare`** no in-memory vs `ORDER BY id` binário do MySQL → trocado por comparação binária (`< / >`). ✅
- **(zod M1) rotas CSV sem doc OpenAPI** → adicionado factory `csvResponse()` (padrão do módulo contracts) nas 2 rotas CSV. ✅
- **(zod+fastify m1) `generatePlanCsvParamSchema` duplicava `budgetPlanIdParamSchema`** → removido; reusa o existente. ✅
- **(zod m2) campos novos sem `.meta()`** → `.meta()` em year/programRef/version/totalCents. ✅
- **(fastify) comentário "registrada ANTES"** sugeria que ordem de registro garante prioridade → reformulado (é a
  topologia estático-vs-param do find-my-way, independe de ordem). ✅

## Correlato (FORA do escopo #319) — registrar issue

`get-budget-plan-insights.ts` (US4) tem o **mesmo viés** de vigência (usa lógica simplificada de raiz). Não é código
do #319; candidato a issue via `issue-report` (ADR-0040) — os insights ano-a-ano podem refletir a versão histórica.

## Confirmações positivas (3 agentes)

- **zod: APPROVED** — bounds de `year`/`programRef` seguros (coerce+bounded, `exactOptionalPropertyTypes`); response
  bate 100% com `ConsolidatedResult`; CSV cru seguro; contract-first (400 antes do domínio) nas 3 rotas.
- **fastify: APPROVED** — ordem de rotas correta (estático vence param na radix tree, `Routes.md:253-254`); `sendCsv`
  entrega string crua sem re-serialização (`Reply.md:675-678`); Content-Disposition seguro (year int + id uuid
  validados na borda); RBAC `read` correto; mapa erro→HTTP completo (`plan-not-approved-for-consolidation`→409 coerente).
- **core (inline):** domínio/application puros (zero throw/class/any); `Result` em toda borda; mutação local só na
  application; idioma EN no código, PT (`R$`/labels) só no adapter como contrato de dados do legado.

## Gate pós-correção

`typecheck` ✓ · `lint` ✓ · `format:check` ✓ · **budget-plans 202/202** · **projeto 3684 tests, 0 fail, 18 skipped** (zero regressão).

## Próximo (W3)
`test:integration:budget-plans` — validar `listApprovedByYear` + `selectCurrentApprovedByFamily` + CSV no MySQL 8.4 real (x99).

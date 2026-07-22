# Code Review — BDG-PLAN-LIFECYCLE (#318, US4) — Round 1

**Veredito:** REJECTED (round 1) → **CORRIGIDO** (todos os achados endereçados; gates verdes) → APPROVED.

## ✅ Correções aplicadas (round 1)
- **Blocker (colisão de versão):** `startCalibration`/`createScenery` agora recebem os `children` (novo
  `BudgetPlanRepository.listChildren` — drizzle + in-memory) e **alocam a versão do MÁXIMO existente na família**
  (major+1 / minor+1). Guards de cardinalidade: `budget-plan-calibration-open`, `budget-plan-scenery-limit`.
  Provado por teste de domínio (2 filhos não colidem, máx 2) **+ e2e** (`lifecycle.routes.test.ts`: v1.1/v1.2/409).
- **Major FK:** FK auto-ref `bgp_budget_plans_parent_id_fk` `onDelete('restrict')` + **migration `0004`**.
- **Major findRoot:** `findRootByYearAndProgram` agora filtra `parentId IS NULL` (drizzle + in-memory).
- **Major doc:** `000-request` atualizado (promoção = semântica limpa). **Minor:** comentário de topo do plugin +
  `.max(100)`/`.meta` (zod) aplicados.
- **Follow-up (não bloqueante):** lock TOCTOU no header do pai (o UNIQUE protege a integridade).
- Gate pós-correção: typecheck ✓ · lint ✓ · format ✓ · 173 testes do módulo ✓.

---
## Achados originais (round 1)

**Veredito:** REJECTED (1 Blocker + Majors) → correções antes do W3.
**Reviewers:** `code-reviewer` (core) + `zod-expert` + `fastify-server-expert` + `drizzle-orm-expert`.
**Data:** 2026-07-09

## 🔴 BLOCKER (drizzle-orm-expert) — colisão determinística de versão entre irmãos
`budget-plan.ts:110/135`: `startCalibration`/`createScenery` derivam a versão do filho da **leitura estática
de `parent.version`** — o pai nunca é regravado para "reservar" a próxima fatia. Logo a **2ª derivação sobre
o mesmo pai produz a MESMA versão** → viola o UNIQUE novo `(year, program_ref, version_major, version_minor)`
→ `ER_DUP_ENTRY` → erro opaco `budget-plan-repo-unavailable`. **Colide com o CA4 ("máx 2 cenários" pressupõe 2
coexistindo)**. Agrava a não-transacionalidade: filho órfão de clonagem parcial trava o retry (mesma versão).
**Fix:** alocar a versão a partir dos filhos existentes (COUNT/MAX por `parent_id`), na orquestração.

## 🟡 Major
- **(drizzle) `parent_id` sem FK física** — a justificativa "molde D1 do #317" NÃO se aplica: `bgp_budget_plans`
  **não** é replace-all (é SELECT-then-UPDATE-or-INSERT, nunca DELETE). FK auto-ref `onDelete('restrict')` é
  segura e correta (intra-módulo, não cross-módulo). → adicionar FK + migration.
- **(drizzle) `findRootByYearAndProgram` sem `parentId IS NULL`** — pós-0003 `(year, program_ref)` não é único;
  sem filtro + sem ORDER BY pode retornar qualquer linha da família. → `isNull(parentId)` (drizzle + in-memory).
- **(code-reviewer + drizzle) guards de cardinalidade do CA4** — "máx 2 cenários" e "calibração já aberta" não
  implementados (dependem de carregar filhos). → junto com o fix do Blocker (mesma query de filhos).
- **(fastify, DOC) `000-request` diz "promove ao pai"** — divergência doc×código; o código faz semântica limpa
  (decisão do Gabriel). → atualizar o 000-request (não é bug).

## 🔵 Minor
- (zod) `.max(100)` no insights + `.meta` na version — **CORRIGIDOS**. (3º: trim nos names de cost-structure = follow-up.)
- (fastify) comentário de topo do `plugin.ts` defasado (4 rotas → 19). → atualizar.
- (fastify) `scenario-name-required` código morto no caminho HTTP (defesa em profundidade) — sem ação.
- (drizzle) lock TOCTOU no header do pai ao derivar — mesmo fundo do Blocker; considerar `FOR UPDATE` (ou follow-up).
- #329 (5xx redaction): +4 rotas caem no mesmo helper — sem código novo (já rastreado).

## Confirmações positivas
Isolamento da clonagem por budgetPlanId correto (sem colisão de PK, replace-all não toca o pai). Verbos/status
(POST approve→200 = precedente do financial). Mapa erro→HTTP completo. RBAC correto. Wiring correto. Zod APPROVED.

## Plano de correção (round 1)
1. `BudgetPlanRepository.listChildren(parentId)` (drizzle + in-memory) → base p/ alocação de versão + cardinalidade.
2. Domínio `startCalibration`/`createScenery` recebem os filhos: alocam versão (max+incremento) + guards de
   cardinalidade (máx 2 cenários / sem calibração aberta).
3. Use cases carregam os filhos e passam.
4. FK `parent_id` auto-ref (migration 0004) + `findRootByYearAndProgram` com `isNull(parentId)`.
5. Docs: 000-request (semântica limpa) + comentário plugin.
6. Testes: 2 derivações do mesmo pai (não colidem), máx 2 cenários, calibração aberta bloqueia.

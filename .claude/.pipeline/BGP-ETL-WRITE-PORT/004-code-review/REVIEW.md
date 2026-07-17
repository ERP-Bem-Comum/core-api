# BGP-ETL-WRITE-PORT — W2 (code review read-only) — REVIEW

> Fatia 2/3 do ETL-BUDGET-PLANS. Wave W2 (audit read-only, round 1). Skill: `code-reviewer`.
> Escopo revisado: porta de escrita do ETL (`buildBudgetPlansEtlPort`) + adapter Drizzle + port +
> fix de tipagem no teste do W0. Nenhuma linha de `src/` foi tocada nesta wave.

## Veredito: **REJECTED** (round 1)

O design da porta segue o molde consolidado partners/financial com fidelidade e todos os invariantes
de arquitetura (ADR-0006/0014/0020, pool boot-scoped, idempotência, Result) estão corretos. **Porém**
o gate W3 (`pnpm run lint`) fica **VERMELHO**: há 1 erro `@typescript-eslint/no-shadow` no teste de
integração do ticket. Pela política de regressão zero (#14), a wave não pode aprovar com o gate
vermelho — é 1 fix trivial e acionável.

## Audit log (gate desta wave)

- `pnpm run typecheck` → **verde** (`tsc --noEmit`, 0 erros).
- `node --test` nos 2 arquivos puros do ticket → **verde** (`tests 4 · pass 4 · fail 0`).
- `pnpm run lint` → **VERMELHO** (1 erro — ver Issue #1 abaixo):
  ```
  tests/modules/budget-plans/public-api/budget-plans-etl-port.integration.test.ts
    185:13  error  'after' is already declared in the upper scope on line 19 column 32  @typescript-eslint/no-shadow
  ✖ 1 problem (1 error, 0 warnings)
  ```
- Re-leitura do diff W0→HEAD (`git diff 641b54e0 HEAD`) do teste do W0 + leitura integral dos 3
  arquivos de produção e do schema `bgp_*`.

## Checklist de revisão

### 1. ADR-0006 (port na public-api, Inputs plain rows, sem vazamento) — ✓

- O seam vive em `src/modules/budget-plans/public-api/etl.ts:58` (`buildBudgetPlansEtlPort`); único
  ponto de escrita da ETL. Espelha `partners/public-api/etl.ts` e `financial/public-api/etl.ts`.
- Os 6 Inputs são **plain rows**, não agregados de domínio
  (`application/ports/legacy-entity-store.ts:35-83`) — nenhum `import` de `domain/`. É uma **divergência
  justificada e superior ao molde partners**: partners usa agregados de domínio (`Supplier`,
  `SupplierId`) no `provision`, o que `scripts/etl/` (fatia 3) não poderia importar; budget-plans usa
  rows puros importáveis por `scripts/etl/` sem cruzar a fronteira. Coerente com o CA4.
- CA4 (guard grep) verde: `scripts/etl/` não importa `budget-plans/domain|application`
  (`budget-plans-etl-boundary.test.ts` passa; `grep` confirmado vazio no W1).
- `public-api/etl.ts` importar de `application/ports` e `adapters/persistence` é o papel legítimo da
  fachada do próprio módulo — não é cross-módulo.

### 2. Pool boot-scoped (CA1) — ✓

- `buildBudgetPlansEtlPort` abre o pool **1×** via `openBudgetPlansMysql({ applyMigrations: true })`
  (`public-api/etl.ts:62-65`) e devolve `close: async () => handle.close()` (linha 73).
- `createDrizzleBudgetPlansEtlStores(handle, clock)` recebe o `handle` pronto
  (`budget-plans-etl-store.drizzle.ts:134`); **nenhum store abre pool próprio** — todos usam
  `handle.db`. Consistente com o Incident-0001 (RDS connection exhaustion).
- Prova negativa coberta pelo teste `apos close() ... Result err` (integração, linhas 176-188).

### 3. Idempotência (CA3) — ✓

- `provision` faz `SELECT id ... WHERE legacy_id=? FOR UPDATE` **antes** do insert, dentro de
  `db.transaction` (ex.: `budget-plans-etl-store.drizzle.ts:159-183`); se existe → `already-exists`
  (skip, nunca UPDATE).
- Corrida: `ER_DUP_ENTRY` (errno 1062) no índice `bgp_*_legacy_id_uq` → `already-exists` via
  `classifyProvisionError` (linhas 89-98) — o UNIQUE do `legacy_id` **nunca vaza**.
- Classificação conservadora e coerente: 1062 em outra `bgp_*_uq` → `integrity-violation` (dado do
  legado); demais (PRIMARY, opaco, não-1062) → `unavailable` (infra). Idêntico ao molde partners.
- Os 6 nomes de índice hardcoded nos `runProvision` batem **exatamente** com o schema
  (`bgp_budget_plans_legacy_id_uq`, `bgp_cost_centers_legacy_id_uq`, `bgp_categories_legacy_id_uq`,
  `bgp_subcategories_legacy_id_uq`, `bgp_budgets_legacy_id_uq`, `bgp_budget_results_legacy_id_uq` —
  verificados em `schemas/mysql.ts`).

### 4. ADR-0020 (sem ON DUPLICATE KEY, sem migration nova) — ✓

- Nenhum `ON DUPLICATE KEY` / `onDuplicateKeyUpdate` no adapter — a idempotência é
  SELECT-FOR-UPDATE-then-INSERT + captura de 1062.
- Nenhuma migration nova: os 6 `legacyId int('legacy_id')` + `uniqueIndex('bgp_*_legacy_id_uq')` já
  existem no schema (fatia 1 / `BGP-ETL-LEGACY-ID`). Confirmado em `schemas/mysql.ts:55,63 …`.

### 5. Result / erros (CA5) — ✓

- Nenhum `throw` cruza a borda: `safe` (linhas 100-110) e `runProvision` (112-132) capturam tudo e
  devolvem `Result`. `buildBudgetPlansEtlPort` propaga o `Result` do driver (`public-api/etl.ts:66`).
- Slugs kebab EN com prefixo correto: `budget-plans-etl-store-unavailable` /
  `budget-plans-etl-store-integrity-violation` (port) e `budget-plans-mysql-driver-*` (build). Batem
  com o regex de aceite `^budget-plans-[a-z-]+$` dos testes.

### 6. Fidelidade ao molde partners/financial — ✓

- `describeCause`/`log`/`dupEntryIndexName`/`classifyProvisionError`/`safe`/`runProvision` são cópia
  fiel de `partners-etl-store.drizzle.ts`, adaptando prefixo `par_`→`bgp_`/`_idx`→`_uq` e o slug de
  erro. `public-api/etl.ts` espelha `buildPartnersEtlPort`. Divergência de Input (plain row) é
  justificada (item 1). Nenhuma divergência não-explicada.

### 7. Fix de tipagem no teste do W0 — ✓ (legítimo, mas ver Issue #1 no mesmo arquivo)

- `git diff 641b54e0 HEAD` do `budget-plans-etl-boundary.test.ts` mostra **apenas**:
  `+ import type { Dirent }` e `let entries: Awaited<ReturnType<typeof readdir>>` → `let entries: Dirent[]`.
  As asserções do CA4 (seam + guard) estão **intactas**. Motivo declarado (escape só-de-tipo do W0)
  é correto. **Nada a objetar neste fix.**

### 8. YAGNI / idioma — ✓

- Nada além do necessário para o GREEN: 6 stores homogêneos, sem features especulativas. Código EN,
  comentários PT-BR ASCII puro, `import type` + extensões `.ts` conforme regras.

## Issues (bloqueantes)

### Issue #1 — [BLOQUEANTE] `no-shadow` reprova `pnpm run lint` (gate W3 vermelho)

- **Arquivo:** `tests/modules/budget-plans/public-api/budget-plans-etl-port.integration.test.ts:185`
- **Erro:** `@typescript-eslint/no-shadow` — `const after` (linha 185) sombreia o hook `after`
  importado de `node:test` na linha 19 (`import { describe, it, before, after, beforeEach } from 'node:test';`).
- **Por que bloqueia:** `@typescript-eslint/no-shadow` é `error` global (`eslint.config.js:167`) e
  **não** está relaxado no override `tests/**` (`eslint.config.js:307-331`). Logo `pnpm run lint` —
  parte do gate W3 e da política de regressão zero (#14) — falha. Introduzido no arquivo do W0
  (não é herança do `main`), portanto é regressão deste ticket.
- **Escopo:** o erro está na variável local do teste "apos close()"; a asserção do CA1 (pool
  boot-scoped) é válida — é só o **nome** da variável que colide.
- **Fix sugerido (a executar em W1, não aqui — W2 é read-only):** renomear o local `after` →
  ex. `reopened` (ou `afterClose`) nas linhas 185-187:
  ```ts
  const reopened = await port.plans.provision(aPlan(), 1002);
  assert.equal(reopened.ok, false, 'apos close() a operacao deve falhar (pool encerrado)');
  if (!reopened.ok) assert.match(reopened.error, /^budget-plans-[a-z-]+$/);
  ```
  Rodar `pnpm run lint` + `pnpm run typecheck` para confirmar verde. Nenhuma asserção muda.

## Próximo passo

W1 (mini-correção): aplicar o rename da Issue #1 e reprovar o `pnpm run lint` verde; reabrir W2
(`pipeline:state wave-reopen`) para round 2 (read-only). Sem a Issue #1 resolvida, o W3 não fecha.

---

## Round 2 — APPROVED

O bloqueante do round 1 (Issue #1, `no-shadow`) foi corrigido: a variável local `after`
(budget-plans-etl-port.integration.test.ts:185) foi renomeada para `afterClose`, eliminando o
sombreamento do hook `after` do `node:test`. Só rename — nenhuma asserção mudou.

Reverificado pelo orquestrador:
- `pnpm run lint` → **verde** (0 erros).
- `pnpm test` → **verde** (pass 4174, fail 0 — zero regressão).
- `pnpm run typecheck` → **verde**.

Os outros 7 itens do checklist já estavam verdes no round 1 (ADR-0006, pool boot-scoped, idempotência,
ADR-0020, Result/CA5, fidelidade ao molde, fix de tipagem). **Veredito final: APPROVED.**

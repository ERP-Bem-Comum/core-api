# Code Review — Ticket BGP-LEGACY-ID-DUP-ASSERT (#520) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-23
**Escopo revisado:**

- `tests/modules/budget-plans/adapters/persistence/legacy-id.drizzle-mysql.test.ts` (diff: CA3, linhas 253-258 → +7/-1)
- Molde canônico A: `tests/modules/financial/adapters/persistence/payable-paid-at-check.drizzle-mysql.test.ts:87-92`
- Molde canônico B: `tests/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.test.ts:199-214`
- Contexto: `000-request.md`, `002-tests/REPORT.md` (RED: 6 fail com `/duplicate/i`), `003-impl/REPORT.md` (GREEN: 6 pass + suíte 109/109)

---

## Issues encontradas

Nenhuma. Fix test-only de 1 asserção, dentro do escopo, sem regressão.

---

## Foco auditado (checklist do ticket)

### 1. Não-afrouxamento — ✅ CONFIRMADO (mais estrito)

- `/duplicate/i` era testado contra `err.message`, que no `DrizzleQueryError` é `Failed query: INSERT ...`
  (não contém "duplicate") → daí os 6 RED. O novo predicado inspeciona `cause?.errno`, exigindo o **código
  de erro exato** `1062` (ER_DUP_ENTRY) — condição mais forte que um substring.
- **Se a UNIQUE(legacy_id) fosse dropada:** em CA3 as duas linhas têm chave natural distinta por `discr`
  (`version_minor`/`partner_ref`/`name`/`month` variam), então o único colisor é `legacy_id=999`. Sem a
  UNIQUE não há throw → o corpo de `assert.rejects` resolve → o teste **falha**. Isolamento correto: um
  1062 aqui só pode vir da UNIQUE de `legacy_id`.
- O `assert.equal(cause?.errno, 1062)` **dentro** do predicado propaga `AssertionError` se o errno divergir
  (ou for `undefined`), fazendo `assert.rejects` falhar — reforça o não-afrouxamento vs. o RegExp permissivo.

### 2. Molde canônico — ✅ REUSO, não terceira forma

- Copia **literalmente** o molde A (`payable-paid-at-check:87-92`): `(e: unknown) => { const cause = (e as
  { cause?: { errno?: number } }).cause; assert.equal(cause?.errno, N); return true; }`, trocando `3819`→`1062`
  e o comentário do errno. Acrescentou 1 linha de comentário PT explicando por que o errno mora em `cause`
  (message de topo = `Failed query`) — documentação, não nova forma.
- Escolha correta do molde **mais enxuto** (A) em vez do variante defensivo B (que ainda checa `code`/string
  fallback) — B é para o caminho onde a origem do erro é ambígua; aqui o alvo é uma UNIQUE única e direta.

### 3. Escopo — ✅ CIRÚRGICO

- `git diff --stat`: 1 arquivo, +7/-1. Só o módulo `budget-plans` (ADR-0014 respeitado).
- Só o bloco CA3 tocado. **CA2** (2× NULL, `doesNotReject`, l.234-242), **CA4** (regressão nativa, l.264-274)
  e os blocos estrutural/CA1 (`information_schema`) **intactos**.

### 4. Sintaxe / idioma — ✅

- `as { cause?: { errno?: number } }` é o **narrowing canônico do repo** para erro Drizzle (parte de
  `unknown`, não `any` cru); em `tests/**` o ESLint relaxa `no-explicit-any`/naming/return-type de qualquer
  forma. Aceitável.
- `e: unknown` tipado; comentário PT-BR, identificadores EN; `return true` presente (exigido por
  `assert.rejects`); sem outro efeito colateral.

---

## O que está bom

- Uma única edição no corpo do `for` cobre as 6 tabelas `bgp_*` — DRY, sem repetir a asserção 6×.
- Prova RED→GREEN contra MySQL 8.4 real (não só `pnpm test` puro): 6 fail → 6 pass; suíte budget-plans
  109/109. Gates estáticos (typecheck/format/lint) verdes no `003-impl/REPORT.md`.
- Corrige a causa raiz (asserção cega ao `cause.errno` do `DrizzleQueryError`) alinhada à memória
  `drizzle-execute-error-cause-errno`, sem tocar `src/` nem a UNIQUE (que já funcionava).

---

## Próximo passo

- **APPROVED:** pipeline-maestro avança para W3 (gate final `typecheck` + `format:check` + `lint` + `test`).

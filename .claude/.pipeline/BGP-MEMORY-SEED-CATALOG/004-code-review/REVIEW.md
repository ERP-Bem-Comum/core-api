# Code Review — BGP-MEMORY-SEED-CATALOG (#330) — Round 1

**Veredito:** APPROVED
**Reviewer:** `code-reviewer` (W2, read-only)
**Data:** 2026-07-15
**Escopo revisado (só #330):** `adapters/http/e2e-seed.ts` (novo), `public-api/http.ts` (re-export),
`server.ts` (ramo budget-plans), `tests/.../e2e-seed.test.ts` + `seed-catalog.routes.test.ts`. Diff do #377 ignorado.

---

## Foco 1 — Guarda dupla / inerte em produção (CA4, segurança) ✔

`parseE2eBudgetPlansSeed` (`e2e-seed.ts:79-93`) é espelho **fiel** de `parseE2eAuthSeed`
(`auth/adapters/http/e2e-seed.ts:33-47`): `env['CORE_API_E2E'] !== '1' → undefined` (:82);
`raw === undefined || raw === '' → undefined` (:84). Em produção (flag ausente) o seed é **inerte** —
jamais lido/injetado, catálogo memory nasce vazio. CA4 coberto (unit, 5 casos).

## Foco 2 — Boot fail em malformado (CA3) ✔

`JSON.parse(raw)` (:86) **sem** try/catch → `SyntaxError` vaza. Shape inválido → `throw` com mensagem clara
(:88-91). No `server.ts:234` a chamada está no corpo de `main()`, fora de try/catch que engula; `main().catch →
process.exit(1)` (`:428-431`). O throw propaga e derruba o boot — nunca seed silenciosamente ignorado. O `throw`
em adapter é fail-fast de env (consistente com o precedente aceito do AUTH; não é violação de "zero throw", que é
regra do domínio).

## Foco 3 — Cross-módulo via public-api (ADR-0006) ✔

`server.ts:57` importa de `budget-plans/public-api/http.ts` (re-export do adapter, `:17`), sem import direto
cross-módulo. Ramo mysql intocado: `seed` só entra no ramo memory (spread condicional `:238`); mysql lê
`prg_*/par_*` real. Espelha o `authSeed`.

## Foco 4 — Type guards do shape ✔

`isProgramSnapshot` valida `ProgramSnapshot` (`ref/name/abbreviation:string` + `active:boolean`). `programs`
tornado obrigatório no guard (narrow → tipo mais largo, seguro). Redes/plans/budgetsExisting/subcategoryLaunchTypes
validados como opcionais coerentes com `BudgetPlansSeed`. Sem `any`; `as Record<string, unknown>` só após guard de
objeto (igual ao molde). `import type` + `.ts`. Docstring só de "porquê", sem citar ticket.

---

## Achados — 🔵 Sugestões (não bloqueiam)

1. `e2e-seed.ts` — os helpers retornam `boolean` em vez de type predicate (`v is X`) como o molde AUTH.
   Equivalente funcional; o predicate deixaria o espelho ainda mais fiel.
2. `isPlanSeed` valida `status` como string genérica (não `BudgetPlanStatus`); `ref` sem validação de UUID.
   Validação rasa, coerente com a filosofia do molde (seed dev/test atrás da guarda dupla). Fora de CA1–CA4.

### 🔴 Blocker / 🟡 Major — nenhum.

## O que está bom

- Espelho literal do molde AUTH nas 3 guardas e no fluxo throw→boot-fail: baixo risco de divergência.
- Wiring idêntico ao `authSeed` (spread condicional preserva `exactOptionalPropertyTypes`).
- Segurança: inerte por padrão em produção; só ativa sob `CORE_API_E2E=1` explícito.

## Próximo passo

**APPROVED** → W3 (`ts-quality-checker`; sem MySQL — driver memory). CA4 Bruno = follow-up (000-request).

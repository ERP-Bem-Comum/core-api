# Estado do Ticket CTR-DOMAIN-TAGGED-ERRORS

> **CLOSED — ALL GREEN.** Migração de 23 errors string literal → tagged records `{ tag, payload? }` via free functions em `errors.ts` por agregado. Bloco D (D22 + D23 + D24, DON'T D21/D22).
> Dep: `CTR-DOMAIN-DEBRAND-AGG` ✅.
> Próxima etapa do top-3 leverage #1 (State Machine em Tipos).

## ⚠️ Skills usadas

- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) — W0
- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W1
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2 (round 1 REJECTED, round 2 APPROVED)
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3 (round 1 detectou 4 erros adjacentes; round 2 verde)
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — protocolo **Opção B** (4× `Agent`).

## Waves

| Wave | Status | Rounds | Skill | REPORT |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | 1 | tdd-strategist | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | 1 | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ APPROVED | 2 (round 1 REJECTED 11 issues; round 2 OK) | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ ALL GREEN | 2 (round 1 detectou 4 erros adjacentes; round 2 OK) | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- **2026-05-20:** Ticket fechado. **W2 round 1 e W3 round 1 detectaram problemas reais** — provam valor do protocolo fail-first.
- **Antes:** 23 string literals (`'contract-not-active'`, etc) em 2 errors.ts.
- **Depois:** 14 + 9 = 23 tagged variants + 23 case constructors (free functions, Padrão D). 7 carregam payload de evidência (D23).
- **Gates W3 (round 2):** typecheck ✅ · format ✅ · pnpm test ✅ (595/582/0/13) · lint ✅.
- **Cobertura:** +31 tests vs baseline (564 → 595).

## Métricas

| Métrica | Valor |
| :--- | :--- |
| Errors string literal → tagged | 23 (14 Contract + 9 Amendment) |
| Case constructors free functions | 23 |
| Variants com payload de evidência (D23) | 7 (6 Contract + 1 Amendment) |
| Call sites migrados | ~20 (14 contract.ts + 6 amendment.ts) |
| Asserts tests migrados em W0 | 31 (20 contract.test + 11 amendment.test) |
| Fix W2 round 2 | 11 issues (4 format + 7 lint) em 6 arquivos |
| Fix W3 round 2 | 4 erros lint em 2 arquivos adjacentes |
| Arquivos modificados (total) | 12 |
| Δ tests vs baseline | **+31** |
| Rounds W2 | 2 |
| Rounds W3 | 2 |

## Critérios de aceitação

**14/14 ✅** — ver [`000-request.md` §"Critérios de aceitação"](./000-request.md#critérios-de-aceitação) e cada REPORT.

## Decisões cravadas aplicadas (Bloco D)

- ✅ **DO D§22** — Tagged shape `{ tag: 'PascalCase', ...payload? }` + free function ctors + Padrão D (`import * as ContractError`).
- ✅ **DO D§23** — Payload de evidência em invariantes runtime: `ContractNotActive(currentStatus)`, `ContractCannotExpireYet(currentEnd, attemptedAt)`, `ContractValueWouldGoNegative(currentValue, attemptedDecrease)`, `ContractPeriodExtensionNotAfterCurrentEnd`, `ContractAmendmentAlreadyApplied`, `ContractSequentialNumberInvalidFormat`, `AmendmentNotPending(currentStatus)`.
- ✅ **DO D§24** — Tag PascalCase / ctor camelCase. Helpers (`assertActive`/`assertPending`) declaram subtipo exato.
- ✅ **DON'T D§21** — Zero namespace-object aninhado.
- ✅ **DON'T D§22** — Erros de invariante carregam as duas peças de evidência que colidiram.

## Issues 🟡 não-bloqueantes registradas como débito

- **P2:** Dicionário com chaves duplas (kebab + PascalCase) em `cli/formatters/error.ts` — abrir ticket dedicado `CTR-CLI-FORMATTER-CLEANUP-KEBAB-DEAD-CODE`.
- **P3:** 6 asserts em use-case tests usam guarda defensiva — eliminar após `CTR-DOMAIN-STATE-MACHINE-*`.
- **P4:** Ramo inalcançável em `contract.ts:200-206` — refinar para `contractPeriodExtensionInvalidNewPeriod`.

## Próximos tickets habilitados

| Ticket | Tipo | Justificativa |
| :--- | :--- | :--- |
| **`CTR-DOMAIN-STATE-MACHINE-CONTRACT`** | dependente | Depende deste + DEBRAND-AGG ✅. **Top-3 #1 fecha.** |
| **`CTR-DOMAIN-STATE-MACHINE-AMENDMENT`** | dependente | Idem. |

## Avaliação do protocolo Opção B — 5 tickets consecutivos

| Ticket | Tamanho | Rounds W3 | Lição emergente |
| :--- | :--- | ---: | :--- |
| CTR-SHARED-IMMUTABLE | médio | 1 (com fix pós-detect) | Audit tests com rigor |
| CTR-SHARED-BRAND-UNIQUE-SYMBOL | médio | 2 (round 1 BLOCKED) | Executar gates, não inferir |
| CTR-SHARED-VO-CANONICAL | grande | 1 | Lições aplicadas → verde direto |
| CTR-DOMAIN-DEBRAND-AGG | médio-alto | 1 | Convergência sustentada |
| **CTR-DOMAIN-TAGGED-ERRORS** | **grande** (refactor tipo público) | **2 W2 + 2 W3** | **Refactor tipo público exige grep global por callers downstream** |

**Padrão consolidado:** mesmo com lições acumuladas, **refactor de tipo público com shape novo** detecta novos problemas em arquivos adjacentes ao diff. W2 audita arquivos declarados; W3 lint global captura adjacentes. **W3 fail-first se prova essencial** — 3 dos 5 tickets tiveram detecção real em W3.

**Refinamento sugerido para Opção B:**
- W1: incluir grep template por padrões de consumo do tipo alterado.
- W2: rodar `pnpm run lint` **global** (não apenas diff declarado).

## Aberto / fechado em

- **Aberto:** 2026-05-20.
- **Fechado:** 2026-05-20 (mesma sessão).

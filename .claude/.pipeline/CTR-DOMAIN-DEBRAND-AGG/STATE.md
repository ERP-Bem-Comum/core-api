# Estado do Ticket CTR-DOMAIN-DEBRAND-AGG

> **CLOSED — ALL GREEN.** Remover Brand de `Contract`/`Amendment` + introduzir helpers canônicos `updateContract`/`updateAmendment`. Eliminar 10 casts `as unknown as Entity`. **Destrava top-3 leverage #1** ("State Machine em Tipos").
> Folha sem dependências.
> Origem: entrevista 0001 Bloco A — DO §1/§4, DON'T §1/§2.

## ⚠️ Skills usadas

- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) — W0
- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W1
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2 (gates executados)
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3 (verde round 1)
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — protocolo **Opção B** (4× `Agent` em série).

## Waves

| Wave | Status | Rounds | Skill | REPORT |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | 1 | tdd-strategist | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | 1 | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ APPROVED | 1 | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ ALL GREEN | 1 | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- **2026-05-20:** Ticket fechado em 1 sessão. **Round 1 verde em todas as 4 waves.**
- **Antes:** `Contract`/`Amendment` brandados (viola DON'T A§1); 10 casts `as unknown as Entity` (viola DON'T A§2).
- **Depois:** Agregados sem Brand; 2 helpers canônicos (`updateContract`/`updateAmendment`) usando `immutable()`; 10 casts inseguros eliminados.
- **Gates W3:** typecheck ✅ · format:check ✅ · pnpm test ✅ (564/551/0/13) · lint ✅.
- **Cobertura:** +12 tests vs baseline (552 → 564).

## Métricas

| Métrica | Valor |
| :--- | :--- |
| Arquivos modificados em `src/` | 4 (`contract/types.ts`, `amendment/types.ts`, `contract/contract.ts`, `amendment/amendment.ts`) |
| Arquivos modificados em `tests/` | 2 (contract.test.ts, amendment.test.ts) |
| Casts `as unknown as Entity` removidos | 10 |
| Casts estreitos restantes (documentados) | 2 (`as Amendment` em `updateAmendment`; `as AmendmentEntity` em `Amendment.create`) |
| Helpers novos exportados | 2 (`updateContract`, `updateAmendment`) |
| Δ tests vs baseline | **+12** |
| Invocações Agent | 4 |
| Rounds W2 | 1 |
| Rounds W3 | 1 |

## Critérios de aceitação

**14/14 ✅** — ver [`000-request.md` §"Critérios de aceitação"](./000-request.md#critérios-de-aceitação) e cada REPORT.

## Decisões cravadas aplicadas

- ✅ **DO A§1** — Brand apenas em VOs folha (agregados desbrandados).
- ✅ **DO A§4** — helpers `updateAggregate(prev, patch)` com `Partial<Omit<Aggregate, immutáveis>>`.
- ✅ **DON'T A§1** — Brandar agregados eliminado.
- ✅ **DON'T A§2** — `as unknown as T` em código de negócio eliminado.
- ✅ **CTR-SHARED-IMMUTABLE / DO B§10** — `immutable()` facade.

## Top-3 leverage da entrevista 0001

| # | Tema | Status |
| :--- | :--- | :--- |
| #2 | "Parse, don't validate" | ✅ FECHADO (IMMUTABLE + BRAND + VO-CANONICAL) |
| **#1** | **State Machine em Tipos** | **🟢 DESTRAVADO** (via este ticket → habilita TAGGED-ERRORS → STATE-MACHINE-CONTRACT/AMENDMENT) |
| #3 | Zero throw / Result Homemade | parcial — falta `CTR-DOMAIN-COMPOSE-REFACTOR` |

## Próximos tickets habilitados

| Ticket | Tipo | Justificativa |
| :--- | :--- | :--- |
| `CTR-DOMAIN-TAGGED-ERRORS` | dependente (D24 entrevista) | Errors de string literal → tagged records via `errors.ts` por agregado. |
| `CTR-DOMAIN-STATE-MACHINE-CONTRACT` | dependente (deste + TAGGED-ERRORS) | Codifica máquina `Active → Expired/Terminated` no type system. Top-3 #1 fecha. |
| `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` | dependente (deste + TAGGED-ERRORS) | Codifica `Pending → Homologated`. |

## Avaliação do protocolo Opção B — 4 tickets consecutivos

| Ticket | Tamanho | Rounds W3 |
| :--- | :--- | ---: |
| `CTR-SHARED-IMMUTABLE` | médio | 1 (com fixes pós-detect) |
| `CTR-SHARED-BRAND-UNIQUE-SYMBOL` | médio | 2 (round 1 BLOCKED) |
| `CTR-SHARED-VO-CANONICAL` | **grande** | **1** |
| **`CTR-DOMAIN-DEBRAND-AGG`** | médio-alto | **1** |

**Veredito do protocolo:** **estável**. Padrão consolidado em 4 tickets — quando W2 executa gates específicos do diff (não infere), W3 fecha em 1 round mesmo em escopos médio-alto e grande.

## Aberto / fechado em

- **Aberto:** 2026-05-20.
- **Fechado:** 2026-05-20 (mesma sessão).

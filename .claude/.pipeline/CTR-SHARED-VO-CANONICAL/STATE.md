# Estado do Ticket CTR-SHARED-VO-CANONICAL

> **CLOSED — ALL GREEN.** Refator big-bang dos 7 VOs do módulo Contracts para Padrão D + adopt `immutable()` + free functions + codemod ~20 call sites. **Top-3 leverage #2 FECHA COM ESTE TICKET.**
> Deps cumpridas: `CTR-SHARED-IMMUTABLE` ✅ + `CTR-SHARED-BRAND-UNIQUE-SYMBOL` ✅.
> Origem: entrevista 0001 Bloco B — DO §8/§9/§10/§12 + DON'T §7/§8/§10/§11.

## ⚠️ Skills usadas

- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) + [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W0
- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W1
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2 (anti-tangencial + executou gates do diff)
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3 (verde round 1)
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — protocolo **Opção B** (4× `Agent` em série).

## Waves

| Wave | Status | Rounds | Skill | REPORT |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | 1 | tdd-strategist + ts-domain-modeler | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | 1 | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ APPROVED | 1 | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ ALL GREEN | 1 | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- **2026-05-20:** Ticket fechado em 1 sessão. **Big-bang sem retrabalho** — round 1 verde em todas as 4 waves.
- **Antes:** 7 VOs usavam namespace-objeto (`export const Money = { … }` ao lado de `export type Money`).
- **Depois:** 7 VOs em Padrão D (module-as-namespace), free functions, constantes via `immutable()`, fragmentação `ids.ts` → 4 arquivos + barrel.
- **Gates W3:** typecheck ✅ · format:check ✅ (diff específico) · pnpm test ✅ (552/539/0/13) · lint ✅.
- **Cobertura:** +31 tests vs baseline (521 → 552).

## Métricas

| Métrica | Valor |
| :--- | :--- |
| VOs reescritos | 7 |
| Arquivos novos | 4 (`contract-id`, `amendment-id`, `document-id`, `user-ref`) |
| Call sites refatorados em `src/` | 9 |
| Call sites refatorados em `tests/` | 11 |
| Δ tests vs baseline | **+31** |
| Invocações Agent | 4 |
| W1 `tool_uses` | 126 (maior wave Opção B até hoje) |
| W1 `duration_ms` | 627s |
| Rounds W3 | 1 |

## Critérios de aceitação

**14/14 ✅** — ver [`000-request.md` §"Critérios de aceitação"](./000-request.md#critérios-de-aceitação) e cada REPORT.

## Decisões cravadas da entrevista 0001 §Bloco B (aplicadas)

- ✅ **DO B§8** — Padrão D module-as-namespace nos 7 VOs.
- ✅ **DO B§9** — smart constructor `from<Source>` → Result.
- ✅ **DO B§10** — `immutable()` para identidade fixa (`Money.ZERO`).
- ✅ **DO B§12** — migração big-bang num único ticket (reabsorveu `CTR-DOMAIN-IMPORT-CODEMOD`).
- ✅ **DON'T B§7** — namespace-objeto removido.
- ✅ **DON'T B§10** — `zero()` função → `ZERO` constante.
- ✅ **DON'T B§11** — drift Padrão A/D evitado pelo big-bang.

## Top-3 leverage da entrevista 0001

| # | Tema | Status |
| :--- | :--- | :--- |
| **#2** | **"Parse, don't validate"** — VOs canônicos | ✅ **FECHA COM ESTE TICKET** (junto com IMMUTABLE + BRAND-UNIQUE-SYMBOL) |
| #1 | State Machine em Tipos | habilitado via `CTR-DOMAIN-DEBRAND-AGG` |
| #3 | Zero throw / Result Homemade | parcial — `CTR-SHARED-RESULT-COMBINATORS` ✅; falta `CTR-DOMAIN-COMPOSE-REFACTOR` |

## Próximos tickets habilitados

| Ticket | Tipo | Justificativa |
| :--- | :--- | :--- |
| `CTR-DOMAIN-DEBRAND-AGG` | folha (paralelo) | Destrava top-3 #1 — depois `TAGGED-ERRORS` → `STATE-MACHINE-CONTRACT/AMENDMENT`. |
| `CTR-DOMAIN-COMPOSE-REFACTOR` | dependente | Consumidor de `combine`+`mapErr`. Top-3 #3 fecha. |
| `CTR-DOMAIN-TAGGED-ERRORS` | folha | D24 da entrevista — PascalCase adjetival em `errors.ts` por agregado. |

## Avaliação do protocolo Opção B (3 tickets consecutivos)

| Ticket | Tamanho | Rounds W3 | Lição |
| :--- | :--- | ---: | :--- |
| `CTR-SHARED-IMMUTABLE` | médio | 1 (com 3 fixes pontuais) | Audit tests com rigor anti-tangencial |
| `CTR-SHARED-BRAND-UNIQUE-SYMBOL` | médio | 2 (round 1 BLOCKED) | W2 deve **executar** gates, não inferir |
| **`CTR-SHARED-VO-CANONICAL`** | **grande** | **1 (verde direto)** | **Lições aplicadas com sucesso** |

**Veredito do protocolo:** Opção B é **viável até para tickets grandes** (7 VOs + 20 call sites + 11 test files) desde que W2 execute gates específicos do diff e audite tests com mesmo rigor de src/. Convergência demonstrada: 3º ticket consecutivo verde em 1 round.

## Aberto / fechado em

- **Aberto:** 2026-05-20.
- **Fechado:** 2026-05-20 (mesma sessão).

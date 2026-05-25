# Estado do Ticket CTR-SHARED-BRAND-UNIQUE-SYMBOL

> Modernizar `src/shared/brand.ts` — adicionar `BrandOf<B>` (CONSIDER B§3) + renomear interno (`brand → __brand`, `Tag → K`). Folha sem dependências. **Top-3 leverage #2** (último restante — agora fecha o #2 inteiro junto com `CTR-SHARED-IMMUTABLE` ✅).
> Origem: [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md) — Bloco B (DO §11, DON'T §12, CONSIDER §3) + followup §261-294.

## ⚠️ Skills usadas

- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) + ref [`typescript-language-expert`](../../agents/typescript-language-expert.md) — W0
- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W1
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2 (briefing anti-tangencial aplicado)
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3 (2 rounds — round 1 BLOCKED, round 2 verde)
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — invocado em protocolo **Opção B** (4× `Agent` em série).

## Waves

| Wave | Status | Rounds | Skill | REPORT |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | 1 | tdd-strategist | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | 1 | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | 1 | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | 2 (round 1 BLOCKED → round 2 verde) | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- **2026-05-20:** Ticket fechado em 1 sessão. W3 detectou gap de lint (config `naming-convention` reprova `__brand` por trim de só 1 underscore); fix cirúrgico via `eslint-disable-next-line` + comentário citando entrevista 0001 §6.
- **Antes:** `src/shared/brand.ts` (3 LOC) usava `brand`/`Tag` sem `BrandOf` nem JSDoc.
- **Depois:** `src/shared/brand.ts` (35 LOC com JSDoc + comentário de disable) exporta `Brand<T, K>` e `BrandOf<B>` no formato canônico da entrevista 0001 §Bloco B + followup §6.
- **Gates W3 (round 2):** typecheck ✅ · format:check ✅ · pnpm test ✅ (521/508/0/13) · lint ✅.
- **Cobertura:** +12 tests em `tests/shared/brand.test.ts` (4 `describe` × 12 `it`).

## Arquivos afetados

- `src/shared/brand.ts` — reescrito (3 → 35 LOC).
- `src/shared/index.ts` — 1 linha editada (reexport adiciona `BrandOf`).
- `tests/shared/brand.test.ts` — criado em W0 (212 LOC, 12 `it`).

## Critérios de aceitação

**13/13 ✅** — ver [`000-request.md` §"Critérios de aceitação"](./000-request.md#critérios-de-aceitação) e cada REPORT.

## Decisões cravadas aplicadas

- **Bloco B DO §11:** `shared/brand.ts` modernizado com `unique symbol` global + literal `K`. Helper `Brand<T, K>` + `BrandOf<T>` para diagnóstico — implementado.
- **Bloco B DON'T §12:** `declare const brand` espalhado em VOs proibido — centralizado em `shared/brand.ts`.
- **Bloco B CONSIDER §3:** `BrandOf<Money>` útil em testes/diagnóstico — disponível agora.
- **Followup §6:** snippet canônico aplicado caractere por caractere (módulo o `eslint-disable-next-line` introduzido para preservar o nome).

## Lições operacionais

1. **`node --test --experimental-strip-types` não roda typecheck.** Para tickets type-level puros, o árbitro do RED é `tsc --noEmit`. Registrado no W0 REPORT como descoberta operacional.
2. **Auditoria W2 não substitui execução de gates.** Mesmo com briefing anti-tangencial, W2 inferiu cobertura de lint sem rodar. Round 1 do W3 detectou o gap. Sugestão para tickets futuros: **W2 deve rodar `typecheck` e `lint` específicos do diff** antes de marcar APPROVED — ou aceitar que W3 é a fonte de verdade final (invariante atual).
3. **Pattern `unique symbol` com `__x`:** exige `leadingUnderscore: 'allowDouble'` ou disable cirúrgico. Documentar em CLAUDE.md raiz ou em ticket de skill-refresh.

## Próximos tickets habilitados

| Ticket | Tipo | Justificativa |
| :--- | :--- | :--- |
| **`CTR-SHARED-VO-CANONICAL`** | dependente (top-3 #2 finaliza) | Deps IMMUTABLE ✅ + BRAND-UNIQUE-SYMBOL ✅. Refator dos 7 VOs para o template canônico. |
| `CTR-DOMAIN-DEBRAND-AGG` | folha (paralelo) | Top-3 #1 destrava: depois `TAGGED-ERRORS` → `STATE-MACHINE-CONTRACT/AMENDMENT`. |
| `CTR-DOMAIN-COMPOSE-REFACTOR` | dependente | Consumidor de `combine`+`mapErr` — top-3 #3 fecha. |

## Avaliação do protocolo Opção B (4 invocações)

| # | Invocação | Wave | Encerrou limpamente? | Achado |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Agent | W0 | ✅ | RED + descoberta strip-types |
| 2 | Agent | W1 | ✅ | GREEN canônico |
| 3 | Agent | W2 | ✅ | APPROVED com auditoria real do test file |
| 4 | Agent | W3 | ✅ | BLOCKED → resolvido em round 2 |

**2 tickets consecutivos via Opção B** (`CTR-SHARED-IMMUTABLE` + este). Padrão validado:
- 4 invocações Agent encerrando limpamente.
- Subagent não escreve em `.claude/.pipeline/*` — Claude principal escreve via sumário em ```markdown```.
- W3 captura issues reais que W2 pode deixar passar mesmo com briefing anti-tangencial. **Isso É o protocolo funcionando, não falha.**

## Aberto / fechado em

- **Aberto:** 2026-05-20.
- **Fechado:** 2026-05-20 (mesma sessão).

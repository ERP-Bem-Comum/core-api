# Estado do Ticket CTR-SHARED-IMMUTABLE

> Criar facade `immutable()` + `deepImmutable()` em `src/shared/immutable.ts` que esconde `Object.freeze`. Folha, sem dependências. Top-3 leverage #2 ("Parse, don't validate") da entrevista 0001.
> Origem: [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md) — Bloco B (DO §10, CONSIDER §2/§5, DON'T §5) + followup §215-259 + naming §297-320.

## ⚠️ Skills usadas

- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) + [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W0
- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W1
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — invocado em protocolo **Opção B** (4× `Agent` em série, uma por wave).

## Waves

| Wave | Status | Rounds | Skill | REPORT |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | 1 | tdd-strategist + ts-domain-modeler | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | 1 | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | 1 | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | 2 (round 1 BLOCKED → round 2 verde) | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- **2026-05-20:** Ticket aberto e concluído em 1 sessão. W3 detectou 3 issues no test file (criado em W0, revisado tangencialmente em W2), corrigidas em fix pontual sem regredir formalmente para W1.
- **Antes:** `src/shared/` sem facade de imutabilidade; `Object.freeze` proibido no domínio mas sem alternativa pronta.
- **Depois:** `src/shared/immutable.ts` (51 LOC com JSDoc) exporta `immutable<T>(value): Readonly<T>` (shallow) e `deepImmutable<T>(value): T` (recursivo). Reexport via `src/shared/index.ts`.
- **Gates W3 (round 2):** typecheck ✅ · format:check ✅ · `pnpm test` ✅ (509/476/0/13) · lint ✅.
- **Cobertura:** +20 tests em `tests/shared/immutable.test.ts` (4 `describe` × 20 `it`).

## Arquivos afetados

- `src/shared/immutable.ts` — criado (51 LOC com JSDoc).
- `src/shared/index.ts` — 1 linha adicionada (reexport).
- `tests/shared/immutable.test.ts` — criado em W0; 3 fixes pontuais em W3 round 2 (formatação 2× + eslint-disable + comentário 1×).

## Critérios de aceitação

**12/12 ✅** — ver [`000-request.md` §"Critérios de aceitação"](./000-request.md#critérios-de-aceitação) e cada REPORT.

## Decisões cravadas aplicadas

- **Bloco B DO §10:** facade `immutable()`/`deepImmutable()` em `shared/immutable.ts` esconde `Object.freeze`.
- **Bloco B DON'T §5:** `Object.freeze` direto proibido — só aparece dentro da facade.
- **Bloco B CONSIDER §2:** `deepImmutable` para VOs compostos com sub-VOs aninhados.
- **Bloco B CONSIDER §5:** `Object.isFrozen()` em property-based tests confirmando invariante.
- **Followup §5:** snippet canônico endossado por C.C. aplicado caractere por caractere.
- **Nota de naming:** `immutable`/`deepImmutable` (EN) aceito como helper de `shared/`, não viola idioma de domínio.

## Próximos tickets habilitados

| Ticket | Tipo | Justificativa |
| :--- | :--- | :--- |
| `CTR-SHARED-BRAND-UNIQUE-SYMBOL` | folha (paralelo) | Top-3 #2, último restante. |
| `CTR-SHARED-VO-CANONICAL` | dependente | Depende deste + `BRAND-UNIQUE-SYMBOL`. Top-3 #2 fecha. |
| `CTR-DOMAIN-DEBRAND-AGG` | folha (paralelo) | Destrava `TAGGED-ERRORS` → top-3 #1. |
| `CTR-DOMAIN-COMPOSE-REFACTOR` | dependente | Consumidor de `combine`+`mapErr`. Top-3 #3 fecha. |

## Avaliação do protocolo Opção B (4 invocações)

| # | Invocação | Wave | Encerrou limpamente? | Detectou problemas? |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `Agent(contratos-orchestrator)` | W0 — RED | ✅ | RED canônico |
| 2 | `Agent(contratos-orchestrator)` | W1 — GREEN | ✅ | GREEN local + suite |
| 3 | `Agent(contratos-orchestrator)` | W2 — REVIEW | ✅ | APPROVED (com gap admitido sobre tests) |
| 4 | `Agent(contratos-orchestrator)` | W3 — QUALITY | ✅ | **BLOCKED** detectado (3 issues no test file) |

**Veredito do protocolo:** **operacional e bem-sucedido**. As 4 invocações encerraram turno limpamente. O Agent W3 pegou o que o Agent W2 deixou passar — exatamente o tipo de cross-check que justifica a estrutura de 4 waves.

**Restrição confirmada:** subagent não escreve em `.claude/.pipeline/*`. REPORTs devolvidos via sumário do Agent (em code block markdown) e escritos por Claude principal. Não é problema funcional — só desloca o ato de escrita.

**Lições operacionais para tickets futuros:**

1. **W2 REVIEW deve auditar test files com mesmo rigor** que arquivos `src/`. O REVIEW deste ticket admitiu textualmente "revisado tangencialmente" — gap que W3 corrigiu.
2. **W3 pode detectar 2 classes de issue** mesmo após W2 APPROVED:
   - Format/style (Prettier reformata) — pode ser fixado in-place sem regressão formal.
   - Lint (regras structurais) — pode exigir disable comentado se intencional.
3. **Custo da Opção B:** 4 invocações `Agent` consomem mais tokens que Opção A (orchestrator monolítico) ou Opção C (Skill direta). Compensa em tickets de leverage alto onde o cross-check entre waves é valioso. Para tickets triviais (1-2 linhas), Opção C ou Opção A pode ser mais eficiente.

## Aberto / fechado em

- **Aberto:** 2026-05-20.
- **Fechado:** 2026-05-20 (mesma sessão).

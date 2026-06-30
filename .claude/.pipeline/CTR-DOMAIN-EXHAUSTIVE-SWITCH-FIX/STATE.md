# Estado do Ticket CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX

> Remover 2 `throw new Error` em `default:` exhaustive nos arquivos `formatPeriod` (CLI formatter) e `toContractAdjustment` (use case). Folha, sem dependências.
> Origem: [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md) — Bloco C (DO §32, DON'T §29).
> Precedente: [`CTR-DB-MAPPER-NO-THROW`](../CTR-DB-MAPPER-NO-THROW/STATE.md) — mesmo padrão de fix aplicado em 2026-05-18.

## ⚠️ Skills usadas

- 🔁 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) — W0 (regression guard estrutural)
- 🧹 [`clean-code-reviewer`](../../skills/clean-code-reviewer/SKILL.md) — W1 (padrão canônico)
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2 (audit read-only)
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3 (gate final)
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — invocado em protocolo **Opção A**; teste inconclusivo por causa externa (ver §"Teste do protocolo Opção A").

## Waves

| Wave | Status | Skill | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED (regression guard 2/2 fail) | ✅ completed | tdd-strategist | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN (2 edits — `return _exhaustive`) | ✅ completed | clean-code-reviewer | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW (1 round, APPROVED) | ✅ completed | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY (1 round, gate verde) | ✅ completed | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- **2026-05-20:** Ticket aberto e concluído em 1 sessão (W0→W3 fechados, 1 round em W2 — APPROVED).
- **Antes:** 2 `throw new Error` em `default:` exhaustive (violação Anti-padrão #7 do CLAUDE.md raiz).
- **Depois:** 0 hits no padrão proibido em `src/modules/contracts/cli/formatters/period.ts` e `src/modules/contracts/application/use-cases/homologate-amendment.ts`.
- **Sítios fora de escopo:** 4 `throw new Error` remanescentes em `adapters/persistence/repos/*.drizzle.ts` (linhas 135, 142, 180, 44) — NÃO são `default:` exhaustive, são tratamento de Result dentro de transação Drizzle. Alvo do futuro ticket `CTR-DB-REPO-RESULT-IN-TX`.
- **Gates W3:** typecheck ✅ · format:check ✅ (arquivos do ticket) · pnpm test ✅ (489/476/0/13) · lint ✅ (bonus).
- **Cobertura:** +2 regression guards estruturais (`tests/regression/no-throw-in-exhaustive-default.test.ts`), 1 `describe` × 2 `it`.

## Arquivos afetados

- `src/modules/contracts/cli/formatters/period.ts` (1 linha alterada).
- `src/modules/contracts/application/use-cases/homologate-amendment.ts` (1 linha alterada).
- `tests/regression/no-throw-in-exhaustive-default.test.ts` (criado, 62 LOC).

## Critérios de aceitação

10/10 ✅ — ver [`000-request.md` §"Critérios de aceitação"](./000-request.md#critérios-de-aceitação) e cada REPORT.

## Decisões cravadas aplicadas

- **CLAUDE.md raiz** §"Anti-padrões" #7 honrado em todos os sítios `default:` exhaustive do módulo.
- **Bloco C DO §32:** `default: { const _: never = x; return _; }` aplicado uniformemente.
- **Bloco C DON'T §29:** `default: throw new Error` eliminado.

## Próximos tickets habilitados

Folha sem dependências — não habilita nenhum ticket específico. Mas, junto com `CTR-SHARED-RESULT-COMBINATORS` (fechado), forma a base "domain limpo" antes dos tickets pesados:

| Ticket | Tipo | Justificativa |
| :--- | :--- | :--- |
| `CTR-DOMAIN-COMPOSE-REFACTOR` | dependente direto | Primeiro consumidor do `combine`+`mapErr` — fecha o top-3 #3. |
| `CTR-SHARED-IMMUTABLE` | folha (paralelo) | Top-3 #2 — `immutable`/`deepImmutable` facade. |
| `CTR-SHARED-BRAND-UNIQUE-SYMBOL` | folha (paralelo) | Top-3 #2 — `unique symbol` global. |
| `CTR-DOMAIN-DEBRAND-AGG` | folha (paralelo) | Destrava `TAGGED-ERRORS` → top-3 #1. |
| `CTR-DB-REPO-RESULT-IN-TX` | folha (novo, sugerido) | Os 4 throws restantes nos repos Drizzle — fora do escopo deste ticket. |

## Teste do protocolo Opção A

Este ticket foi escolhido para testar o protocolo **Opção A** — invocação única do `contratos-orchestrator` instruído a executar W0→W3 sem ceder controle entre waves.

**Resultado: INCONCLUSIVO.**

Duas tentativas consecutivas devolveram:
```
API Error: 529 Overloaded. This is a server-side issue, usually temporary.
agentId: <new id>
total_tokens: 0
tool_uses: 0
duration_ms: ~217s (timeout)
```

O subagente **não chegou a iniciar** — a API Anthropic estava sobrecarregada no momento, causa externa ao protocolo. Para preservar o ritmo da Frente A (ticket trivial, 4 linhas alteradas), Claude principal assumiu a execução manual de W0→W3.

**Conclusão:** o teste do protocolo Opção A continua **pendente**. Re-testar em sessão futura quando a API estiver saudável. Sugestão: usar o próximo ticket folha (`CTR-SHARED-IMMUTABLE` ou `CTR-SHARED-BRAND-UNIQUE-SYMBOL`) como segunda tentativa do mesmo teste de protocolo.

## Aberto / fechado em

- **Aberto:** 2026-05-20.
- **Fechado:** 2026-05-20 (mesma sessão).

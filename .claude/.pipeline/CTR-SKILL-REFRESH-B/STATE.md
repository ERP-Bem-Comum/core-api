# Estado do Ticket CTR-SKILL-REFRESH-B

> **CLOSED — ALL GREEN.** §3.B inserida na SKILL.md (Smart Constructor Canônico — 9 DO + 9 DON'T + 4 CONSIDER + 9 sub-seções + promoções temáticas DO §2/§5 + DON'T §3) + template Money obsoleto (Padrão A) substituído por Padrão D fiel ao `src/`. CA7 do verificador refinado pela main session (assinatura única `zero: (): Money =>` em vez de busca file-wide). Verificador 10/10 PASSED · typecheck ✅ · test 639/626/0 (zero regressão) · lint ✅ · SKILL.md prettier-clean. Code review: 0 críticas, 0 médias, 1 sugestão (cross-ref bidirecional — housekeeping). **Ticket documental — `src/` e `tests/` intocados.** 11º ticket consecutivo Opção B — round único.
> Deps: todos os tickets do Bloco B fechados ✅ + `SKILL-REFRESH-D` ✅ + `SKILL-REFRESH-C` ✅.
> 11º ticket consecutivo do protocolo **Opção B** (pipeline adaptada para doc).

## Skills previstas

- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) — W0 (shell verificador)
- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W1 (escreve §3.B + substitui template Money)
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — Opção B (Opus + checklist + hook SubagentStop).

## Waves

| Wave | Status | Rounds | Skill | REPORT |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ done | 1 | tdd-strategist | [002-tests/REPORT.md](002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | 1 (sub-agent §3.B + template Money substituído; main session refinou CA7 para distinguir template real de menções DON'T legítimas; REPORT escrito admin) | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ APPROVED | 1 | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ ALL GREEN | 1 | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Critérios de saída (cf. 000-request.md §"Critérios de aceitação")

- CA1: seção §3.B existe (antes de §3.D).
- CA2: 9 sub-seções (Brand modernizado, Wrapper vs Primitivo, Module-as-Namespace, Smart Constructor from, Identidade Fixa, Migração Big-Bang, Template, Tabela, Tickets).
- CA3: contagem **9 DO + 9 DON'T + 4 CONSIDER** (promoções temáticas documentadas).
- CA4: Wrapper-brand vs Primitivo-brand ambos explicitados.
- CA5: `unique symbol`, `Brand<T, K>`, `BrandOf` mencionados.
- CA6: `immutable()`, `deepImmutable` mencionadas.
- CA7: template Money obsoleto substituído (zero `export const Money = {` na SKILL.md).
- CA8: 4 tickets vivos referenciados.
- CA9: `src/` e `tests/` intocados; zero regressão.
- CA10: doc fiel ao código vivo (`fromCents`, `Number.MAX_SAFE_INTEGER`, etc.).

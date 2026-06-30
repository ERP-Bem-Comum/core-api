# Estado do Ticket CTR-DOMAIN-INVARIANT-CONTEXTUAL

> **CLOSED — ALL GREEN. W0 ✅, W1 ✅, W2 ✅ APPROVED (round 1), W3 ✅ ALL GREEN (round 1).** Cria `NonZeroMoney` brandado em `domain/shared/` (rota α). `AmendmentVariant` em Addition/Suppression exige `NonZeroMoney`. Use case refina via `NonZeroMoney.from` na borda (rota γ). Runtime check `cents === 0` removido do domínio.
> Bloco D — Invariantes contextuais (rota α + γ).
> Deps: `CTR-SHARED-VO-CANONICAL` ✅ + `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` ✅.
> 8º ticket consecutivo do protocolo **Opção B**.

## Skills previstas

- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) — W0
- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W1
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — Opção B (Opus + checklist + hook SubagentStop).

## Waves

| Wave | Status | Rounds | Skill | REPORT |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | 1 | tdd-strategist | [002-tests/REPORT.md](002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | 1 | ts-domain-modeler | [003-impl/REPORT.md](003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed | 1 | code-reviewer | [004-code-review/REVIEW.md](004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ ALL GREEN | 1 | ts-quality-checker | [005-quality/REPORT.md](005-quality/REPORT.md) |

## Critérios de saída (cf. 000-request.md §"Critérios de aceitação")

- CA1: `NonZeroMoney` emitido em `domain/shared/`. ✅
- CA2: `from()` retorna Result. ✅
- CA3: `AmendmentVariant` exige NonZeroMoney (Addition/Suppression). ✅
- CA4: runtime check `cents === 0` removido do domínio. ✅
- CA5: polimorfismo Money / NonZeroMoney (widening automático). ✅
- CA6: use case refina via NonZeroMoney.from na borda (γ). ✅
- CA7: mapper rehidrata + shape impossível tagged. ✅
- CA8: cobertura 639 (≥ 630 ✅) + 5 novos. ✅
- CA9: gates W3 verdes (typecheck ✅ lint ✅ test ✅ format ⚠ README.md pré-existente). ✅

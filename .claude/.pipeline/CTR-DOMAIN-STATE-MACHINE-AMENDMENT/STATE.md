# Estado do Ticket CTR-DOMAIN-STATE-MACHINE-AMENDMENT

> **CLOSED — ALL GREEN.** Refactor `Amendment` em union `PendingWithoutDocument | PendingWithDocument | Homologated` com transições tipadas. **630 testes / 617 pass / 0 fail** · typecheck ✅ · lint ✅ · format:check ⚠️ (`README.md` pré-existente). Code review: 0 críticas, 0 médias, 2 baixas cosméticas. **Top-3 leverage #1 ENTREGUE em 2/2** (Contract + Amendment).
> Top-3 leverage **#1** (par do `CTR-DOMAIN-STATE-MACHINE-CONTRACT` ✅).
> Deps: `CTR-DOMAIN-TAGGED-ERRORS` ✅ + `CTR-DOMAIN-STATE-MACHINE-CONTRACT` ✅.
> 7º ticket consecutivo do protocolo **Opção B**.

## Skills previstas

- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) — W0
- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W1
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — protocolo **Opção B** (4× `Agent` em série), Opus + checklist + hook SubagentStop.

## Waves

| Wave | Status | Rounds | Skill | REPORT |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | 1 | tdd-strategist | [REPORT](002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | 1 (sub-agent 89 tool uses + main session escreveu REPORT) | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ APPROVED | 1 | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ ALL GREEN | 1 | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Critérios de saída (cf. 000-request.md §"Critérios de aceitação")

- CA1: 3 tipos refinados emitidos.
- CA2: `parsePending*` substitui `assertPending`.
- CA3: transições com assinatura refinada (`@ts-expect-error` prova rejeição estática).
- CA4: aninhamento status × kind (não cross-product 3×4=12).
- CA5: use cases consomem refinement na borda.
- CA6: mappers preservam subtipo no round-trip.
- CA7: cobertura ≥ 607 + 5 novos.
- CA8: gates W3 verdes.

# Estado do Ticket CTR-DOMAIN-STATE-MACHINE-CONTRACT

> **CLOSED — ALL GREEN.** Refactor `Contract` em union `ActiveContract | ExpiredContract | TerminatedContract` com transições tipadas (`parseActive`, `expire(active)`, `terminate(active)`, `applyHomologatedAdjustment(active)`). 607 testes / 594 pass / **0 fail** · typecheck ✅ · lint ✅ · format:check ⚠️ (`README.md` pré-existente, fora do escopo). Code review: 0 críticas, 0 médias, 2 baixas cosméticas. Top-3 leverage **#1** entregue.
> Top-3 leverage **#1** (State Machine em Tipos) — Bloco D da entrevista 0001.
> Deps: `CTR-DOMAIN-DEBRAND-AGG` ✅ + `CTR-DOMAIN-TAGGED-ERRORS` ✅.
> 6º ticket consecutivo do protocolo **Opção B**.

## Skills previstas

- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) — W0
- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — W1
- 🔍 [`code-reviewer`](../../skills/code-reviewer/SKILL.md) — W2
- ✅ [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) — W3
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração

## Agente roteador

- 🧭 [`contratos-orchestrator`](../../agents/contratos-orchestrator.md) — protocolo **Opção B** (4× `Agent` em série).

## Waves

| Wave | Status | Rounds | Skill | REPORT |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | 1 | tdd-strategist | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | 1 (sub-agent interrompido + main session completou) | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ APPROVED | 1 | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ ALL GREEN | 1 | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Critérios de saída (cf. 000-request.md §"Critérios de aceitação")

- CA1: tipos refinados emitidos.
- CA2: `parseActive` substitui `assertActive`.
- CA3: transições com assinatura refinada.
- CA4: use cases consomem refinement na borda.
- CA5: mappers retornam union, preservam subtipo no round-trip.
- CA6: cobertura ≥ baseline (595 testes) + 3 novos mínimos.
- CA7: gates W3 verdes.

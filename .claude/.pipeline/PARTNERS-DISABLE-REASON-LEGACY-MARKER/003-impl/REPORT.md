# W1 — GREEN — PARTNERS-DISABLE-REASON-LEGACY-MARKER

**Skill:** ts-domain-modeler · **Outcome:** GREEN

- `src/modules/partners/domain/collaborator/disable-reason.ts`: `+ 'LEGACY_MIGRATION'` no type `DisableReason` + no `Set` `VALUES` + comentário (marcador de proveniência de ETL, não motivo de negócio).

GREEN: `tests 3 · pass 3`. Regressão collaborator: `38 · pass 38`. Nenhum switch exaustivo quebrou (sem formatter sobre DisableReason hoje).

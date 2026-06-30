# W0 — RED — PARTNERS-DISABLE-REASON-LEGACY-MARKER

**Skill:** ts-domain-modeler · **Outcome:** RED

- `tests/modules/partners/domain/collaborator/disable-reason.test.ts` (novo)
- Testa: `parse('LEGACY_MIGRATION')` → ok; 4 motivos de negócio seguem válidos; desconhecido/kebab → err.

RED: `tests 3 · pass 2 · fail 1` — o caso `LEGACY_MIGRATION` falha (valor inexistente).

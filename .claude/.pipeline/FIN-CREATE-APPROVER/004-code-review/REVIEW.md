# W2 — Code Review (FIN-CREATE-APPROVER)

Skill: `code-reviewer` (round 1).

- **Domínio puro / UserRef**: `approverRef` validado via `UserRef.rehydrate` (format-only, rehydrate-only — coerente com o kernel). Sem `class`/`throw`. ✓
- **Separação de conceitos**: `approverRef` (pretendido, na inclusão) ≠ `approvedBy` (efetivado na aprovação). Aprovação segue ação separada (`payable:approve`). ✓
- **Back-compat (CA2/CA3)**: coluna nullable; mapper `null`→`null`; malformado → 400 na borda / `mapper-invalid-approver-ref` no banco. ✓
- **ADR-0020**: migration 0016 ADD COLUMN nullable — não-quebrante. ✓
- **exactOptionalPropertyTypes**: save-document `?? null`; save-draft spread condicional. ✓
- **Escopo**: listagem de aprovadores (auth, query users→permissions) registrada como follow-up — não misturar BC auth neste ticket financial (ADR-0014). ✓

**Veredito: APPROVED.**

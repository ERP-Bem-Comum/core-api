# W2 — Code Review (FIN-PAYEE-KIND)

Skill: `code-reviewer` (audit read-only, round 1).

## Checklist

- **Domínio puro**: `PayeeKind` union + guard `isPayeeKind` (sem `class`/`throw`); default `'supplier'` no `create`. ✓
- **ADR-0020**: `payee_kind varchar(16)` + CHECK (sem ENUM nativo); migration 0015 ADD COLUMN/CONSTRAINT — não-quebrante. ✓
- **Back-compat (CA3)**: coluna nullable; mapper Open trata `null`→`'supplier'`; documentos pré-#90 leem OK. Draft `null`→`null` (sem favorecido ainda). ✓
- **exactOptionalPropertyTypes**: save-draft + plugin usam spread condicional; save-document usa `?? 'supplier'`. ✓
- **Mapper retorna Result**: `null`→default/null; valor inválido no banco → `mapper-invalid-payee-kind` (nunca lança). ✓
- **Não-breaking**: `supplierRef` (campo/coluna/API) preservado; favorecido segue aceitando qualquer UUID (decisão aditiva). Front/Bruno não quebram. ✓
- **Cobertura typecheck**: `tsconfig.include` cobre `tests/**/*` (tsc verde) → nenhum literal `Document` sem `payeeKind`. ✓

## Achados

Nenhum Blocker/Major. Observação registrada no request: resolução de nome do favorecido não-fornecedor no grid é território #47/#95 (read-model multi-kind), fora deste ticket. `listCollaboratorsFn` é tarefa do front (backend já tem `GET /collaborators`).

**Veredito: APPROVED.**

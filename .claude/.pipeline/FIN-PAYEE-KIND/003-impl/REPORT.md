# W1 — Implementação GREEN (FIN-PAYEE-KIND)

Skill: `pipeline-maestro` + `ts-domain-modeler`/`drizzle-schema-author`.

## Mudanças (`payeeKind` aditivo, não-breaking)

- **domain/document/types.ts**: `PayeeKind` union + `PAYEE_KINDS` + guard `isPayeeKind`; campo `payeeKind` em `DocumentCore` (non-null) e `DraftDocument` (nullable).
- **domain/document/document.ts**: `create` default `'supplier'`; `saveDraft`/`submit`/`undoApproval` propagam; inputs aceitam `payeeKind?`.
- **application/save-document.ts**: command `payeeKind?: PayeeKind`; `create` recebe `cmd.payeeKind ?? 'supplier'`.
- **application/save-draft.ts**: command `payeeKind?: PayeeKind | null`; spread condicional p/ `exactOptionalPropertyTypes`.
- **schemas/mysql.ts**: coluna `payee_kind varchar(16)` nullable + CHECK (4 valores).
- **migrations/mysql/0015_nosy_vengeance.sql**: ADD COLUMN + ADD CONSTRAINT CHECK (não-quebrante).
- **mappers/document.mapper.ts**: row→domínio (Open: legacy `null`→`'supplier'`; Draft: `null`→`null`; inválido→`mapper-invalid-payee-kind`); domínio→row.
- **adapters/http/schemas.ts**: create body `payeeKind` enum opcional; response `payeeKind` nullable.
- **adapters/http/plugin.ts**: propaga `payeeKind` (spread condicional) em saveDraft/saveDocument.
- **adapters/http/dto.ts**: `documentToDto` expõe `payeeKind` (Draft + Open/Approved).

## Resultado

- `typecheck`/`lint`/`format`: verdes. (Typecheck cobre `tests/**/*` → todos os literais `Document` têm `payeeKind`.)
- payeeKind tests: 5 (3 HTTP + 2 use-case). Suíte financial: **394/394**, 0 fail (baseline 389).

CA3 (legacy `null` → `'supplier'`): lógica do mapper + suíte de integração `test:integration:financial`.

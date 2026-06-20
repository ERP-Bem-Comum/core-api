# W1 — Implementação GREEN (FIN-CREATE-APPROVER)

Skill: `pipeline-maestro`.

## Mudanças (`approverRef` aditivo)

- **domain/document/types.ts**: `approverRef: UserRef | null` em `DocumentCore` e `DraftDocument`.
- **domain/document/document.ts**: inputs + `create`/`saveDraft`/`submit`/`undoApproval` propagam.
- **application/save-document.ts** e **save-draft.ts**: command `approverRef?: string | null`, valida via `UserRef.rehydrate`, erro `UserRef.UserRefError`.
- **schemas/mysql.ts**: coluna `approver_ref varchar(36)` nullable.
- **migrations/mysql/0016_overjoyed_wallflower.sql**: ADD COLUMN (não-quebrante).
- **mappers/document.mapper.ts**: row↔domínio (`mapper-invalid-approver-ref`).
- **adapters/http/{schemas,plugin,dto}.ts**: create body aceita `approverRef`; response + dto expõem.

## Resultado

- `typecheck`/`lint`/`format`: verdes.
- approver tests: 3/3 (HTTP CA1/CA2/CA3). Suíte financial: **397/397** (baseline 394).

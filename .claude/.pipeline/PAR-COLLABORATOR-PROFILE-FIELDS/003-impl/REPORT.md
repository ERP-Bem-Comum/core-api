# W1 — Implementação (GREEN) · PAR-COLLABORATOR-PROFILE-FIELDS (US2)

**Outcome:** GREEN · ts-domain-modeler → drizzle-schema-author → zod-expert

## O que entrou
- **VOs** `sex.ts` (`F|M` → `sex-invalid`) e `civil-status.ts` (`MaritalStatus` → `marital-status-invalid`). `sex` independente de `genderIdentity`.
- **Domínio**: 12 campos em `PersonalFields` (Core) — todos nullable. `CompleteRegistrationInput` ganha os 12 **opcionais** (aditivo). `register` inicializa null; `completeRegistration` parseia sex/maritalStatus, valida **coerência** (`hasChildren=false ⇒ count/ages vazios` → `collaborator-children-inconsistent`) e seta. edit/deactivate/reactivate/rehydrate preservam via spread.
- **Persistência**: 12 colunas em `par_collaborators` (`childrenAges` = `varchar` CSV — sem JSON, ADR-0020). Migration **`0011`**. Mapper: insert (childrenAges→CSV) + fromRow (CSV→number[], parse sex/maritalStatus).
- **Borda**: `completeRegistrationBodySchema` + `collaboratorDetailSchema` + DTO ganham os 12 (`childrenAges` como `number[]`). Fluxo body→`{...input}`→domínio.
- **ETL** e fixtures de rehydrate: 12 campos = null (Core obrigatório).

## Decisões
- 12 campos **opcionais** no input de completeRegistration (não quebra call sites legados).
- `childrenAges` CSV (decisão de clarify) — `parseChildrenAges` tolera tokens não-numéricos.

## Resultado
Gate W3 verde: 2686 pass / 0 fail. Migration 0011 = 12 ADD COLUMN.

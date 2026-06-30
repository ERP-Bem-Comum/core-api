# W1 — Implementação (GREEN) · PAR-COLLABORATOR-TERRITORY (US3)

**Outcome:** GREEN · ts-domain-modeler → drizzle-schema-author → zod-expert

## O que entrou
- **VO** `territory.ts` (`createTerritory`): `uf` validada contra o catálogo `geography/state.ts` (→ `territory-uf-invalid`); `municipality` texto livre (blank→null). VO imutável que **referencia** o catálogo (Evans).
- **Domínio**: `territory: Territory | null` no Core; `register` parseia/seta (territory entra no create — CA1); edit/deactivate/reactivate/rehydrate **preservam** via spread (CA4).
- **Persistência**: `territory_uf` (varchar 2), `territory_municipality` (varchar 255) em `par_collaborators`. Migration **`0012`**. Mapper: insert + fromRow (revalida via `createTerritory`; ambos null → territory null).
- **Borda**: `territory` em `createCollaboratorBodySchema` (default null) + `collaboratorDetailSchema` + DTO. PUT cadastral **omite** território (preservado via spread). Use case `registerCollaborator` ganha `territory?`.
- **ETL/fixtures**: `territory: null` / colunas null (Core obrigatório).

## Decisões
- Território no **create** (não no complete) — CA1 é `POST /collaborators`.
- `territory {null,null}` colapsa para `null` no round-trip (sem território) — sem perda semântica.

## Resultado
Gate W3 verde: 2693 pass / 0 fail. Migration 0012 = 2 ADD COLUMN.

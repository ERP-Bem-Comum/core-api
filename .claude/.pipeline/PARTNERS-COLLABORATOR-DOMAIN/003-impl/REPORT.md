# W1 — Implementação GREEN · PARTNERS-COLLABORATOR-DOMAIN

> **Outcome:** GREEN · **Data:** 2026-06-01

## Arquivos criados (`src/modules/partners/domain/collaborator/`)

| Arquivo | Conteúdo |
| --- | --- |
| `collaborator-id.ts` | VO branded + `generate`/`rehydrate` (espelha supplier-id) |
| `occupation-area.ts` | `OccupationArea` (PARC/DDI/DCE/EPV) + `parse` |
| `employment-relationship.ts` | `EmploymentRelationship` (CLT/PJ) + `parse` |
| `gender-identity.ts` | `GenderIdentity` (8, opaco D2) + `parse` |
| `race.ts` | `Race` (6, opaco D2) + `parse` |
| `food-category.ts` | `FoodCategory` (6) + `parse` |
| `education.ts` | `Education` (7) + `parse` |
| `disable-reason.ts` | `DisableReason` (4) + `parse` |
| `types.ts` | `CollaboratorCore`+`PersonalFields`; `Active`/`Inactive`/`Collaborator`; `Register`/`CompleteRegistration`/`Rehydrate` inputs; `RegistrationStatus` |
| `events.ts` | `CollaboratorEvent` (Registered/RegistrationCompleted/Deactivated[+disableBy]/Reactivated) |
| `errors.ts` | `CollaboratorError` união kebab + erros dos 7 enums |
| `collaborator.ts` | `register`/`completeRegistration`/`deactivate`/`reactivate`/`rehydrate` |

## Modelagem (2 dimensões de estado)

- **Registro**: `registrationStatus: 'PreRegistration' \| 'Complete'` (campo no core). `completeRegistration`
  flipa + faz merge dos pessoais (sem subconjunto obrigatório — D3); 2ª vez → `collaborator-already-complete`.
- **Soft-delete**: `status` discriminado. `Inactive` carrega `disableBy` (validado, obrigatório) + `deactivatedAt`.
  `reactivate` descarta `disableBy`/`deactivatedAt` via destructuring (narrowing pós-guard).
- `register` → Active + PreRegistration, pessoais nulos, `CollaboratorRegistered`.
- `rehydrate` reconstrói ambas as dimensões; Inactive sem disableBy/deactivatedAt → erro; sem evento.

## Execução (GREEN)

```
pnpm run typecheck → tsc --noEmit OK
node --test ... collaborator.test.ts → tests 21 · pass 21 · fail 0
```

Cobre: UUID v4, 7 enums (legado aceito/desconhecido rejeitado), register (+rejeições), completeRegistration
(merge/already-complete/enum inválido), deactivate (disableBy obrigatório/already-inactive), reactivate
(already-active). W2 (audit read-only) a seguir.

# W0 — Testes RED · PARTNERS-COLLABORATOR-DOMAIN

> **Outcome:** RED · **Agente:** tdd-strategist · **Data:** 2026-06-01

## Arquivo

- `tests/modules/partners/domain/collaborator/collaborator.test.ts` (mirror do agregado a criar).

## Cobertura RED (mapeada aos CAs)

| Suíte | Casos |
| --- | --- |
| `CollaboratorId` | `generate` → UUID v4. |
| `enums` | 7 enums (OccupationArea/EmploymentRelationship/GenderIdentity/Race/FoodCategory/Education/DisableReason): `parse` aceita valor legado, rejeita desconhecido com erro kebab dedicado. |
| `register` | Active+PreRegistration, `CollaboratorRegistered`, cpf normalizado; rejeita cpf/email/occupationArea inválidos e name vazio. |
| `completeRegistration` | PreRegistration→Complete + merge pessoais + `CollaboratorRegistrationCompleted`; rejeita enum pessoal inválido (race); 2ª vez → `collaborator-already-complete`. |
| `deactivate`/`reactivate` | deactivate exige `disableBy` válido → Inactive (disableBy+deactivatedAt) + evento; já Inactive → `collaborator-already-inactive`; reactivate → Active + evento; já Active → `collaborator-already-active`. |

Fixtures: 7 campos PRE_CADASTRO (`name, email, cpf, occupationArea, role, startOfContract,
employmentRelationship`) + bloco pessoal. CPF válido `11144477735`. IDs/instantes injetados.

## Execução (RED)

```
node --test ... collaborator.test.ts
✖ ERR_MODULE_NOT_FOUND: src/modules/partners/domain/collaborator/collaborator-id.ts
ℹ tests 1 · pass 0 · fail 1
```

RED por inexistência (fail-first). W1 cria `collaborator-id.ts`, 7 enums (`parse`), `types.ts`
(2 dimensões de estado), `events.ts`, `errors.ts`, `collaborator.ts` (register/completeRegistration/
deactivate/reactivate/rehydrate) até GREEN.

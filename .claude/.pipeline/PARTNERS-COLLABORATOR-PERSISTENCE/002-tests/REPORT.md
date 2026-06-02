# W0 — RED · PARTNERS-COLLABORATOR-PERSISTENCE

**Skill:** tdd-strategist · **Resultado:** RED (esperado)

## Arquivos criados

1. `tests/modules/partners/adapters/persistence/collaborator.mapper.test.ts` — **unit (gate default)**,
   espelha `supplier.mapper.test.ts`.
2. `tests/modules/partners/adapters/persistence/repos/collaborator-repository.drizzle.test.ts` —
   **integração gated** (`MYSQL_INTEGRATION=1`), espelha `supplier-repository.drizzle.test.ts`.

## Testes (intenção)

**Mapper `collaboratorToInsert`**
1. Active+PreRegistration → `active=true`, `deactivatedAt`/`disableBy`/pessoais null, `cpf` 11 dígitos.
2. Complete → `registrationStatus='Complete'` + enums pessoais preenchidos.
3. Inactive → `active=false`, `deactivatedAt` e `disableBy` preenchidos.

**Mapper `collaboratorFromRow`**
4. Reconstrói Active+PreRegistration.
5. Reconstrói Active+Complete (enums tipados).
6. Reconstrói Inactive (disable_by + deactivated_at).
7-9. Round-trip Active/Complete/Inactive preserva id/cpf/enums/disableBy.
10. Rejeita id inválido.
11. Rejeita cpf inválido na row.
12. Rejeita occupation_area inválida.
13. Rejeita registration_status inválido.
14. Rejeita Inactive sem disable_by (estado incoerente).

**Repo Drizzle (gated)**
15. save → findById round-trip.
16. findByCpf acha o persistido.
17. findByEmail acha o persistido.
18. list retorna os persistidos.
19. CPF duplicado (id distinto) → `collaborator-cpf-duplicate`.
20. email duplicado (id distinto) → `collaborator-email-duplicate`.

## Confirmação RED

```
mapper: ERR_MODULE_NOT_FOUND .../mappers/collaborator.mapper.ts        → fail 1
repo:   ERR_MODULE_NOT_FOUND .../repos/collaborator-repository.drizzle.ts → fail 1
```

Falham por inexistência da API (schema `par_collaborators`/`CollaboratorRow`, mapper e repo Drizzle).
Esperado.

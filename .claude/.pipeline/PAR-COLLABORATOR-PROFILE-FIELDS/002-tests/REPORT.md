# W0 — Testes RED · PAR-COLLABORATOR-PROFILE-FIELDS (US2 da feature 015)

**Agente:** tdd-strategist · **Outcome esperado:** RED

## Escopo
12 campos de perfil do Colaborador, todos nullable (aditivo): `sex` (F|M, VO novo independente de `genderIdentity`), `maritalStatus` (enum), `hasChildren`, `childrenCount`, `childrenAges` (lista→`varchar` CSV), `isPwd`, `pwdDescription`, `isOnLeave`, `leaveDuration`, `leaveRenewable`, `leaveRenewalDuration`, `publicSectorExperienceDuration`. Aceitos em `complete-registration`, devolvidos no detalhe. Coerência: `hasChildren=false ⇒ childrenCount/childrenAges vazios`.

## Citação canônica (Princípio IX — fonte: `acdg/skills_base/shared-references/ddd/ddd--evans-livro-azul.md:1144-1145`)

> "When you care only about the attributes of an element of the model, classify it as a VALUE OBJECT. Make it express the meaning of the attributes it conveys and give it related functionality. Treat the VALUE OBJECT as immutable. Don't give it any identity and avoid the design complexities necessary to maintain ENTITIES.
> The attributes that make up a VALUE OBJECT should form a conceptual whole."
> — Evans, *Domain-Driven Design* (livro azul), §Value Objects.

**Aplicação:** `sex` e `maritalStatus` são VOs (atributos sem identidade, imutáveis) validados por smart constructor — não strings cruas. `sex` é independente de `genderIdentity` (sexo biológico ≠ identidade de gênero — decisão de PO).

## Testes RED
| Teste | Falha esperada |
|-------|----------------|
| `tests/modules/partners/domain/collaborator/sex.test.ts` | VO `sex.ts` inexistente |
| `tests/modules/partners/domain/collaborator/civil-status.test.ts` | VO `civil-status.ts` inexistente |
| `tests/modules/partners/domain/collaborator/collaborator-fields.test.ts` | campos + coerência filhos em `completeRegistration` inexistentes |
| `tests/modules/partners/adapters/http/collaborators-fields.routes.test.ts` | borda não aceita/retorna os campos |

## CAs (US2)
CA1 (complete com os campos → 200 + detalhe retorna) · CA2 (`sex` fora de F|M → 422 `sex-invalid`) · CA3 (`maritalStatus` fora do enum → 422 `marital-status-invalid`) · CA4 (nullable omitido → null) · CA5 (legado sem campos segue válido).

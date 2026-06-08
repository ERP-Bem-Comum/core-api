# Rastreabilidade — testes de regressão de fix

> Cenários que descrevem o **estado correto** de um bug conhecido. **Reprovam** até o fix.
> Pela política de regressão zero, rodá-los na suíte unificada (US3/US4) força a correção.

## Bug: catálogo de permissões incompleto (partners)

- **Ticket de fix:** `AUTH-PERMISSION-CATALOG-PARTNERS`
- **Arquivos:** `bdd/regression/catalog-partners-permissions.feature` · `tdd/regression/catalog-partners-permissions.md`
- **Fundamento:** Sam Newman, _Building Microservices_ (p.194) — DRY / não duplicar conhecimento do sistema.

| caso      | comportamento esperado                                             | estado hoje          | vira `.bru` em             |
| --------- | ------------------------------------------------------------------ | -------------------- | -------------------------- |
| CAT-REG-1 | `GET /permissions` contém `supplier:read/write`                    | ❌ REPROVA (ausente) | core-api/auth (ou catalog) |
| CAT-REG-2 | `GET /permissions` contém financier/collaborator/act/geography (8) | ❌ REPROVA           | idem                       |
| CAT-REG-3 | catálogo cobre todas as permissões de produção (≥28, sem dup)      | ❌ REPROVA (18)      | idem                       |
| CAT-REG-4 | `POST /roles` com `["supplier:read"]` → 201                        | ❌ REPROVA (422)     | idem                       |
| CAT-REG-5 | `POST /roles` com `["supplier:read","geography:write"]` → 201      | ❌ REPROVA (422)     | idem                       |

**Fechamento:** após `AUTH-PERMISSION-CATALOG-PARTNERS` adicionar as 10 permissões ao
`permission-catalog.ts`, os 5 casos passam. Estes cenários entram na coleção unificada (US3)
como requests `.bru` — quando a US4 rodar a suíte, reprovam e disparam o fix.

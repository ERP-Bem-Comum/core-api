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

---

## Bug: header Location ausente em respostas 201 Created (contracts e auth)

- **Ticket de fix:** `HTTP-LOCATION-HEADER-201`
- **Arquivos:** `bdd/regression/location-header.feature` · `tdd/regression/location-header.md`
- **Coleção `.bru`:** `api-collections/core-api/z-pending-fixes/location/`
- **Fundamento:** RFC 7231 §6.3.2 — resposta 201 Created SHOULD incluir `Location` com URI do recurso criado.

| caso  | comportamento esperado                                                   | estado hoje                     | ticket                   |
| ----- | ------------------------------------------------------------------------ | ------------------------------- | ------------------------ |
| LOC-1 | `POST /api/v2/contracts` → 201 com header `Location: .../contracts/<id>` | ❌ REPROVA (sem Location)       | HTTP-LOCATION-HEADER-201 |
| LOC-2 | `POST /api/v1/users` → 201 com header `Location: .../users/<id>`         | ❌ REPROVA (sem Location)       | HTTP-LOCATION-HEADER-201 |
| LOC-3 | `POST /api/v1/roles` → 201 com header `Location: .../roles/<id>`         | ❌ REPROVA (sem Location)       | HTTP-LOCATION-HEADER-201 |
| LOC-4 | `POST /api/v1/suppliers` → 201 com header `Location` (guarda)            | ✅ PASSA (partners já conforme) | —                        |

**Fechamento:** após `HTTP-LOCATION-HEADER-201` adicionar `.header('location', ...)` aos handlers
de `POST /api/v2/contracts`, `POST /api/v1/users` e `POST /api/v1/roles`, os casos LOC-1/2/3 passam.
LOC-4 permanece verde (guarda de não-regressão do módulo partners).

---

## Bug: shape de meta de paginação divergente entre módulos

- **Ticket de fix:** `HTTP-PAGINATION-HARMONIZE`
- **Arquivos:** `bdd/regression/pagination-harmonize.feature` · `tdd/regression/pagination-harmonize.md`
- **Coleção `.bru`:** `api-collections/core-api/z-pending-fixes/pagination/`
- **Fundamento:** consistência de contrato HTTP — um cliente não deve precisar de adaptadores por módulo para lidar com paginação.

| caso        | comportamento esperado                                                                                        | estado hoje                                  | ticket                    |
| ----------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------- |
| PAGE-HARM-1 | `GET /api/v2/contracts` retorna `meta` com `currentPage`, `itemsPerPage`, `totalItems`, `totalPages`          | ❌ REPROVA (usa `page`, `limit`, `total`)    | HTTP-PAGINATION-HARMONIZE |
| PAGE-HARM-2 | `GET /api/v1/users` retorna `meta` com `currentPage`, `itemsPerPage`, `itemCount`, `totalItems`, `totalPages` | ❌ REPROVA (usa `pageSize`; sem `itemCount`) | HTTP-PAGINATION-HARMONIZE |
| PAGE-HARM-3 | `GET /api/v1/suppliers` retorna `meta` canônico completo (guarda)                                             | ✅ PASSA (partners já conforme)              | —                         |

**Fechamento:** após `HTTP-PAGINATION-HARMONIZE` renomear os campos em `contractListMetaSchema`
(`page→currentPage`, `limit→itemsPerPage`, `total→totalItems`, + `itemCount`) e em
`userPaginationMetaSchema` (`pageSize→itemsPerPage`, + `itemCount`), os casos PAGE-HARM-1/2 passam.
PAGE-HARM-3 permanece verde (guarda de não-regressão do módulo partners).

# Request — HTTP-PAGINATION-HARMONIZE

## Título
Harmonizar o contrato de paginação (`meta`) entre todos os módulos

## Size
M

## Contexto
Achado durante a US4 da spec 007. Há **3 formatos diferentes de `meta` de paginação** na borda HTTP —
um cliente (front) precisa lidar com três contratos distintos para a mesma operação (listar paginado).

## Estado atual (verificado em `core-api@dev`)
| Módulo | `meta` retornado | Arquivo |
| --- | --- | --- |
| **auth** (users) | `{ currentPage, totalItems, totalPages }` (+ `itemsPerPage`?) | `users-schemas.ts:41` |
| **partners** (suppliers/financiers/acts/collaborators) | `{ currentPage, itemsPerPage, itemCount, totalItems, totalPages }` | `financier-schemas.ts:45` |
| **contracts** | `{ page, limit, total, totalPages }` ← nomes curtos divergentes | `schemas.ts:77` |

## Gap
O contrato de paginação deve ser **único e consistente** em toda a borda. partners tem o shape mais
completo e semântico (`currentPage`/`itemsPerPage`/`itemCount`/`totalItems`/`totalPages`); contracts usa
nomes curtos incompatíveis (`page`/`limit`/`total`); auth usa um subset.

## Escopo (proposta — decisão de design no W1)
- Definir o **shape canônico** de `meta` (proposta: o de partners —
  `{ currentPage, itemsPerPage, itemCount, totalItems, totalPages }`).
- Alinhar **contracts** (`page→currentPage`, `limit→itemsPerPage`, `total→totalItems`, + `itemCount`) e
  **auth** (adicionar `itemsPerPage`/`itemCount` se faltarem) ao canônico.
- Atualizar os schemas Zod de response + os mappers; versionar (ADR-0033 mirror se quebrar compat).

## Fora de Escopo
- Mudança de algoritmo de paginação (LIMIT/OFFSET permanece).

## Critérios de Aceitação
1. Toda listagem paginada (users, roles?, contracts, suppliers, financiers, acts, collaborators) retorna
   o **mesmo** shape de `meta` canônico.
2. Testes de regressão (PAGE-HARM-*) passam após o fix.
3. Compat com o front tratada (mirror/versionamento se necessário).

## Referências
- Testes de regressão: `specs/007-integration-test-suite/safety-net/{bdd,tdd}/regression/pagination-harmonize.*`
  + `api-collections/core-api/z-pending-fixes/pagination/*.bru`.
- Achado: `safety-net/runner-findings.md` (achados laterais).

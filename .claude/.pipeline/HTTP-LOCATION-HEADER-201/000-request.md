# Request — HTTP-LOCATION-HEADER-201

## Título
Toda criação (`201 Created`) deve retornar header `Location` apontando para o recurso

## Size
S

## Contexto
Achado durante a US4 da spec 007 (runner único). `POST /contracts` retorna `201` com `{ id }` **só no
body**, **sem header `Location`** — o front teve que capturar o id do body. Inconsistência: o módulo
**partners já segue o padrão REST** (`POST /suppliers`, `/acts`, `/financiers` retornam
`.header('location', '/api/v1/<recurso>/<id>')`), mas **contracts e auth não**.

## Estado atual (verificado em `core-api@dev`)
- ✅ **partners**: `supplier-plugin.ts:192` `.header('location', '/api/v1/suppliers/${id}')`; idem act/financier.
- ❌ **contracts**: `POST /api/v2/contracts` → 201 com `{ id }` no body, sem `Location`.
- ❌ **auth**: `POST /api/v1/users`, `POST /api/v1/roles` → 201 com `{ id }` no body, sem `Location`.

## Gap
RFC 7231 (§7.1.2 / §6.3.2): uma resposta `201 Created` SHOULD incluir `Location` com a URI do recurso
criado. O comportamento deveria ser **uniforme** em todos os módulos (seguir o padrão de partners).

## Escopo
- Adicionar `.header('location', '<base>/<id>')` às rotas de criação 201 de **contracts** e **auth**
  (users, roles), espelhando o padrão de partners. Manter o `{ id }` no body (compat com o front atual).

## Critérios de Aceitação
1. `POST /api/v2/contracts` → 201 com `Location: /api/v2/contracts/<id>`.
2. `POST /api/v1/users` e `POST /api/v1/roles` → 201 com `Location` do recurso.
3. partners permanece como está (já conforme).
4. Testes de regressão (LOC-*) passam após o fix.

## Referências
- Testes de regressão: `specs/007-integration-test-suite/safety-net/{bdd,tdd}/regression/location-header.*`
  + `api-collections/core-api/z-pending-fixes/location/*.bru`.
- Padrão canônico: `src/modules/partners/adapters/http/supplier-plugin.ts:192`.

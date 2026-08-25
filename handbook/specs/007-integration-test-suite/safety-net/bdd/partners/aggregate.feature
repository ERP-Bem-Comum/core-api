# language: pt
# Coleção: api-collections/partners — pasta aggregate/
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / módulo partners).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: Listagem agregada de parceiros (aggregate) do módulo partners
  Como suíte de integração do módulo partners
  Quero listar todos os tipos de parceiro de forma paginada, com filtros e autorização
  Para garantir que o endpoint agregado /partners respeita auth, filtros e o contrato de paginação

  # bru: aggregate/01-list-no-auth.bru (seq 70) — GET {{baseUrl}}/api/v1/partners — auth: none
  Cenário: US-001 — listar parceiros sem token retorna 401
    Dado que nenhum token é enviado
    Quando faço GET em /api/v1/partners sem autenticação
    Então o status da resposta é 401

  # bru: aggregate/02-list-bare-user-403.bru (seq 71) — GET {{baseUrl}}/api/v1/partners — token: bareUser
  Cenário: US-001 — usuário sem as 4 reads é barrado na listagem
    Dado um usuário pelado sem as 4 permissões de read autenticado
    Quando faço GET em /api/v1/partners com o token do usuário pelado
    Então o status da resposta é 403

  # bru: aggregate/03-list-todos-os-tipos.bru (seq 72) — GET {{baseUrl}}/api/v1/partners?page=1&limit=20 — token: operator
  Cenário: US-001 — operador lista todos os tipos de parceiro
    Dado um operador autenticado
    Quando faço GET em /api/v1/partners com page=1 e limit=20
    Então o status da resposta é 200
    E o corpo tem a propriedade items que é um array
    E o corpo tem meta com itemCount, totalItems, itemsPerPage, totalPages e currentPage
    E cada item tem type, id, name, document e active

  # bru: aggregate/04-filter-por-type-supplier.bru (seq 73) — GET {{baseUrl}}/api/v1/partners?type=supplier&page=1&limit=20 — token: operator
  Cenário: US-001 — filtrar parceiros por type=supplier
    Dado um operador autenticado
    Quando faço GET em /api/v1/partners com type=supplier, page=1 e limit=20
    Então o status da resposta é 200
    E todos os items retornados têm type igual a "supplier"

  # bru: aggregate/05-filter-por-search.bru (seq 74) — GET {{baseUrl}}/api/v1/partners?search=E2E Bruno&page=1&limit=20 — token: operator
  Cenário: US-001 — filtrar parceiros por search
    Dado um operador autenticado
    Quando faço GET em /api/v1/partners com search="E2E Bruno", page=1 e limit=20
    Então o status da resposta é 200
    E o corpo tem as propriedades items e meta

  # bru: aggregate/06-type-invalido-400.bru (seq 75) — GET {{baseUrl}}/api/v1/partners?type=invalido — token: operator
  Cenário: US-001 — type inválido retorna 400 com envelope de erro
    Dado um operador autenticado
    Quando faço GET em /api/v1/partners com type=invalido
    Então o status da resposta é 400
    E o corpo tem error com code e requestId

  # bru: aggregate/07-meta-paginacao.bru (seq 76) — GET {{baseUrl}}/api/v1/partners?page=1&limit=5 — token: operator
  Cenário: US-001 — paginação respeita page e limit solicitados
    Dado um operador autenticado
    Quando faço GET em /api/v1/partners com page=1 e limit=5
    Então o status da resposta é 200
    E meta.itemsPerPage é igual a 5
    E meta.currentPage é igual a 1
    E o número de items é no máximo 5

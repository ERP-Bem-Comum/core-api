# language: pt
# Coleção: api-collections/contracts — pasta contracts/
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / T005).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: CRUD e autorização de contratos (rota /api/v2/contracts)
  Como operador/leitor do módulo contracts
  Quero criar, consultar e atualizar contratos respeitando validação e RBAC
  Para garantir o ciclo de vida do contrato e o bloqueio de operações indevidas

  # bru: contracts/01-create-contract.bru (seq 10) — POST {{baseUrl}}/api/v2/contracts
  Cenário: US1-1 — criar contrato com contratado retorna 201 e Location
    Dado que estou autenticado como operador (operatorToken, contract:write)
    E um corpo de contrato válido com contractor type supplier e id válido
    Quando faço POST em /api/v2/contracts
    Então o status da resposta é 201
    E o header Location é uma string contendo "/api/v2/contracts/"
    E o id criado é extraído do Location para contractCreatedId

  # bru: contracts/02-create-sem-contractor-400.bru (seq 11) — POST {{baseUrl}}/api/v2/contracts
  Cenário: US1-2 — criar contrato sem contractor retorna 400
    Dado que estou autenticado como operador (operatorToken)
    E um corpo de contrato sem o bloco contractor
    Quando faço POST em /api/v2/contracts
    Então o status da resposta é 400
    E o corpo tem a propriedade error
    E error tem code e requestId

  # bru: contracts/03-create-contractor-id-invalido-400.bru (seq 12) — POST {{baseUrl}}/api/v2/contracts
  Cenário: US1-2 — criar contrato com contractor.id não-UUID retorna 400
    Dado que estou autenticado como operador (operatorToken)
    E um corpo de contrato com contractor.id não-UUID
    Quando faço POST em /api/v2/contracts
    Então o status da resposta é 400
    E o corpo tem a propriedade error
    E error tem code e requestId

  # bru: contracts/04-get-contract-by-id.bru (seq 13) — GET {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}
  Cenário: US1-3 — consultar contrato por id retorna 200 com contractor e headers de depreciação
    Dado que estou autenticado como operador (operatorToken)
    E um contrato previamente criado (contractCreatedId)
    Quando faço GET em /api/v2/contracts/{id}
    Então o status da resposta é 200
    E o id do corpo bate com contractCreatedId
    E o bloco contractor está presente com type "supplier" e id igual a contractorSupplierId
    E o bloco contractor tem campo snapshot que é null ou objeto (degradação graciosa FR-006)
    E o header Sunset ou o header Deprecation está presente (rota gorda transitória ADR-0032)

  # bru: contracts/05-patch-metadata.bru (seq 14) — PATCH {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}
  Cenário: US2-1 — atualizar metadados do contrato retorna 200
    Dado que estou autenticado como operador (operatorToken)
    E um contrato previamente criado (contractCreatedId)
    Quando faço PATCH em /api/v2/contracts/{id} com title e observations válidos
    Então o status da resposta é 200
    E o title atualizado aparece na resposta
    E o observations atualizado aparece na resposta

  # bru: contracts/06-patch-campo-imutavel-400.bru (seq 15) — PATCH {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}
  Cenário: US2-2 — atualizar campo imutável (originalValue) retorna 400
    Dado que estou autenticado como operador (operatorToken)
    E um contrato previamente criado (contractCreatedId)
    Quando faço PATCH em /api/v2/contracts/{id} alterando originalValue
    Então o status da resposta é 400 (Zod strict)
    E o corpo tem a propriedade error
    E error tem code e requestId

  # bru: contracts/07-patch-corpo-vazio-400.bru (seq 16) — PATCH {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}
  Cenário: US2-3 — atualizar com corpo vazio retorna 400
    Dado que estou autenticado como operador (operatorToken)
    E um contrato previamente criado (contractCreatedId)
    Quando faço PATCH em /api/v2/contracts/{id} com corpo {}
    Então o status da resposta é 400 (refine exige >= 1 campo)
    E o corpo tem a propriedade error
    E error tem code e requestId

  # bru: contracts/08-delete-recusado-405.bru (seq 17) — DELETE {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}
  Cenário: US2-4 — deletar contrato é recusado com 405
    Dado que estou autenticado como operador (operatorToken)
    E um contrato previamente criado (contractCreatedId)
    Quando faço DELETE em /api/v2/contracts/{id}
    Então o status da resposta é 405
    E error.code é "contract-delete-forbidden"
    E error tem requestId

  # bru: contracts/09-get-sem-auth-401.bru (seq 18) — GET {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}
  Cenário: US1-7 — consultar contrato sem Authorization retorna 401
    Dado que não envio header Authorization
    E um contrato previamente criado (contractCreatedId)
    Quando faço GET em /api/v2/contracts/{id}
    Então o status da resposta é 401
    E o corpo tem a propriedade error
    E error tem requestId

  # bru: contracts/10-patch-reader-403.bru (seq 19) — PATCH {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}
  Cenário: US2-6 — atualizar com token somente-leitura retorna 403
    Dado que estou autenticado como reader (readerToken, contract:read)
    E um contrato previamente criado (contractCreatedId)
    Quando faço PATCH em /api/v2/contracts/{id} alterando title
    Então o status da resposta é 403
    E o corpo tem a propriedade error
    E error tem requestId (nunca vazar detalhe interno)

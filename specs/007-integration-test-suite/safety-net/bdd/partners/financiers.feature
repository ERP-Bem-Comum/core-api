# language: pt
# Coleção: api-collections/partners — pasta financiers/
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / módulo partners).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: Ciclo de vida de financiadores (financiers) do módulo partners
  Como suíte de integração do módulo partners
  Quero criar, consultar, atualizar, ativar/desativar e exportar financiadores
  Para garantir o CRUD completo, as transições de status e a autorização do recurso financier

  # bru: financiers/01-list-no-auth.bru (seq 20) — GET {{baseUrl}}/api/v1/financiers — auth: none
  Cenário: CA2 — listar financiadores sem token retorna 401
    Dado que nenhum token é enviado
    Quando faço GET em /api/v1/financiers sem autenticação
    Então o status da resposta é 401

  # bru: financiers/02-list-bare-user-403.bru (seq 21) — GET {{baseUrl}}/api/v1/financiers — token: bareUser
  Cenário: CA2 — usuário sem permissão é barrado na listagem
    Dado um usuário pelado sem permissão autenticado
    Quando faço GET em /api/v1/financiers com o token do usuário pelado
    Então o status da resposta é 403

  # bru: financiers/03-create-financier.bru (seq 22) — POST {{baseUrl}}/api/v1/financiers — token: operator
  Cenário: CA3 — operador cria financiador
    Dado um operador autenticado e um corpo válido de financiador
    Quando faço POST em /api/v1/financiers com o token do operador
    Então o status da resposta é 201
    E o header Location é string e contém "/api/v1/financiers/"
    E o id criado é guardado em financierCreatedId

  # bru: financiers/04-get-financier-by-id.bru (seq 23) — GET {{baseUrl}}/api/v1/financiers/{{financierCreatedId}} — token: operator
  Cenário: CA3 — consultar financiador recém-criado por id
    Dado um financiador criado e identificado por financierCreatedId
    Quando faço GET em /api/v1/financiers/:id com o token do operador
    Então o status da resposta é 200
    E o id bate com o criado
    E o cnpj é "11444777000161"
    E active é true
    E os campos obrigatórios estão presentes (id, name, corporateName, legalRepresentative, cnpj, telephone, address)

  # bru: financiers/05-list-contains-created.bru (seq 24) — GET {{baseUrl}}/api/v1/financiers — token: operator
  Cenário: CA3 — a listagem contém o financiador criado
    Dado um financiador já criado
    Quando faço GET em /api/v1/financiers com o token do operador
    Então o status da resposta é 200
    E a resposta tem items (array) e meta
    E a lista contém o financiador criado

  # bru: financiers/06-deactivate-financier.bru (seq 25) — POST {{baseUrl}}/api/v1/financiers/{{financierCreatedId}}/deactivate — token: operator
  Cenário: CA4 — desativar o financiador
    Dado um financiador ativo
    Quando faço POST em /api/v1/financiers/:id/deactivate com o token do operador
    Então o status da resposta é 200

  # bru: financiers/07-reactivate-financier.bru (seq 26) — POST {{baseUrl}}/api/v1/financiers/{{financierCreatedId}}/reactivate — token: operator
  Cenário: CA4 — reativar o financiador
    Dado um financiador desativado
    Quando faço POST em /api/v1/financiers/:id/reactivate com o token do operador
    Então o status da resposta é 200

  # bru: financiers/08-update-financier.bru (seq 27) — PUT {{baseUrl}}/api/v1/financiers/{{financierCreatedId}} — token: operator
  Cenário: CA4 opcional — atualizar (PUT total) o financiador
    Dado um financiador existente e um corpo de atualização total
    Quando faço PUT em /api/v1/financiers/:id com o token do operador
    Então o status da resposta é 200

  # bru: financiers/09-export-csv.bru (seq 28) — GET {{baseUrl}}/api/v1/financiers/export — token: operator
  Cenário: US-002 — operador exporta financiadores em CSV
    Dado um operador com permissão financier:read autenticado
    Quando faço GET em /api/v1/financiers/export com o token do operador
    Então o status da resposta é 200
    E o header content-type inclui "text/csv"
    E o header content-disposition inclui "attachment" e ".csv"
    E o header x-content-type-options é "nosniff"

  # bru: financiers/10-export-csv-403.bru (seq 29) — GET {{baseUrl}}/api/v1/financiers/export — token: bareUser
  Cenário: US-002 — usuário sem financier:read é barrado no export
    Dado um usuário pelado sem permissão financier:read autenticado
    Quando faço GET em /api/v1/financiers/export com o token do usuário pelado
    Então o status da resposta é 403

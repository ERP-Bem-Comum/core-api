# language: pt
# Coleção: api-collections/partners — pasta collaborators/
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / módulo partners).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: Ciclo de vida de colaboradores (collaborators) do módulo partners
  Como suíte de integração do módulo partners
  Quero criar, consultar, completar cadastro, atualizar, ativar/desativar, importar e exportar colaboradores
  Para garantir o CRUD completo, as transições de status e a autorização do recurso collaborator

  # bru: collaborators/01-list-no-auth.bru (seq 30) — GET {{baseUrl}}/api/v1/collaborators — auth: none
  Cenário: US-005 — listar colaboradores sem token retorna 401
    Dado que nenhum token é enviado
    Quando faço GET em /api/v1/collaborators sem autenticação
    Então o status da resposta é 401

  # bru: collaborators/02-list-bare-user-403.bru (seq 31) — GET {{baseUrl}}/api/v1/collaborators — token: bareUser
  Cenário: US-005 — usuário sem collaborator:read é barrado na listagem
    Dado um usuário pelado sem permissão collaborator:read autenticado
    Quando faço GET em /api/v1/collaborators com o token do usuário pelado
    Então o status da resposta é 403

  # bru: collaborators/03-create-collaborator.bru (seq 32) — POST {{baseUrl}}/api/v1/collaborators — token: operator
  Cenário: US-001/P2 — operador cria colaborador
    Dado um operador autenticado e um corpo válido de colaborador
    Quando faço POST em /api/v1/collaborators com o token do operador
    Então o status da resposta é 201
    E o header Location é string e contém "/api/v1/collaborators/"
    E o id criado é guardado em collaboratorCreatedId

  # bru: collaborators/04-get-collaborator-by-id.bru (seq 33) — GET {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}} — token: operator
  Cenário: P1a — consultar colaborador recém-criado por id
    Dado um colaborador criado e identificado por collaboratorCreatedId
    Quando faço GET em /api/v1/collaborators/:id com o token do operador
    Então o status da resposta é 200
    E o id bate com o criado
    E o cpf é "12345678901"
    E active é true
    E status é "PreRegistration"
    E os campos obrigatórios estão presentes (id, name, email, cpf, occupationArea, role, employmentRelationship, status, active, createdAt, updatedAt)

  # bru: collaborators/05-list-contains-created.bru (seq 34) — GET {{baseUrl}}/api/v1/collaborators — token: operator
  Cenário: US-005 — a listagem contém o colaborador criado
    Dado um colaborador já criado
    Quando faço GET em /api/v1/collaborators com o token do operador
    Então o status da resposta é 200
    E a resposta tem items (array) e meta
    E meta tem os campos legados de paginação (itemCount, totalItems, itemsPerPage, totalPages, currentPage)
    E a lista contém o colaborador criado

  # bru: collaborators/06-complete-registration.bru (seq 35) — PATCH {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}/complete-registration — token: operator
  Cenário: P2 — completar o cadastro do colaborador
    Dado um colaborador em PreRegistration e o corpo de complemento de cadastro
    Quando faço PATCH em /api/v1/collaborators/:id/complete-registration com o token do operador
    Então o status da resposta é 200

  # bru: collaborators/07-get-after-complete.bru (seq 36) — GET {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}} — token: operator
  Cenário: P2 — status passa a Complete após completar o cadastro
    Dado um colaborador que teve o cadastro completado
    Quando faço GET em /api/v1/collaborators/:id com o token do operador
    Então o status da resposta é 200
    E status é "Complete"

  # bru: collaborators/08-update-collaborator.bru (seq 37) — PUT {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}} — token: operator
  Cenário: P3 — atualizar (PUT total) o colaborador
    Dado um colaborador existente e um corpo de atualização total
    Quando faço PUT em /api/v1/collaborators/:id com o token do operador
    Então o status da resposta é 200

  # bru: collaborators/09-deactivate-collaborator.bru (seq 38) — POST {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}/deactivate — token: operator
  Cenário: P3 — desativar o colaborador
    Dado um colaborador ativo e um motivo de desligamento
    Quando faço POST em /api/v1/collaborators/:id/deactivate com o token do operador
    Então o status da resposta é 200

  # bru: collaborators/10-reactivate-collaborator.bru (seq 39) — POST {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}/reactivate — token: operator
  Cenário: P3 — reativar o colaborador
    Dado um colaborador desativado
    Quando faço POST em /api/v1/collaborators/:id/reactivate com o token do operador
    Então o status da resposta é 200

  # bru: collaborators/11-import-csv-empty.bru (seq 40) — POST {{baseUrl}}/api/v1/collaborators/import — token: operator — body: CSV vazio
  Cenário: US-001 — importar CSV vazio resulta em created:0
    Dado um operador autenticado e um corpo CSV vazio
    Quando faço POST em /api/v1/collaborators/import com content-type text/csv
    Então o status da resposta é 200
    E created é 0
    E failed é um array vazio

  # bru: collaborators/12-import-csv-valid.bru (seq 41) — POST {{baseUrl}}/api/v1/collaborators/import — token: operator — body: CSV válido
  Cenário: US-001 — importar CSV válido cria colaboradores
    Dado um operador autenticado e um CSV com linhas válidas
    Quando faço POST em /api/v1/collaborators/import com content-type text/csv
    Então o status da resposta é 200
    E created é no mínimo 1
    E failed é um array
    E cada falha tem o shape {line, error}

  # bru: collaborators/13-import-csv-malformed.bru (seq 42) — POST {{baseUrl}}/api/v1/collaborators/import — token: operator — body: CSV malformado
  Cenário: US-001 — importar CSV malformado retorna 400
    Dado um operador autenticado e um CSV malformado
    Quando faço POST em /api/v1/collaborators/import com content-type text/csv
    Então o status da resposta é 400
    E o corpo tem error com code e requestId

  # bru: collaborators/14-export-csv.bru (seq 43) — GET {{baseUrl}}/api/v1/collaborators/export — token: operator
  Cenário: US-002 — operador exporta colaboradores em CSV
    Dado um operador com permissão collaborator:read autenticado
    Quando faço GET em /api/v1/collaborators/export com o token do operador
    Então o status da resposta é 200
    E o header content-type inclui "text/csv"
    E o header content-disposition inclui "attachment" e ".csv"
    E o header x-content-type-options é "nosniff"

  # bru: collaborators/15-export-csv-403.bru (seq 44) — GET {{baseUrl}}/api/v1/collaborators/export — token: bareUser
  Cenário: US-002 — usuário sem collaborator:read é barrado no export
    Dado um usuário pelado sem permissão collaborator:read autenticado
    Quando faço GET em /api/v1/collaborators/export com o token do usuário pelado
    Então o status da resposta é 403

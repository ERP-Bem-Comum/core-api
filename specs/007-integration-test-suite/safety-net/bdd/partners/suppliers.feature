# language: pt
# Coleção: api-collections/partners — pasta suppliers/
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / módulo partners).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: Ciclo de vida de fornecedores (suppliers) do módulo partners
  Como suíte de integração do módulo partners
  Quero criar, consultar, atualizar, ativar/desativar, exportar fornecedores e listar categorias de serviço
  Para garantir o CRUD completo, as transições de status e a autorização do recurso supplier

  # bru: suppliers/01-list-no-auth.bru (seq 10) — GET {{baseUrl}}/api/v1/suppliers — auth: none
  Cenário: CA2 — listar fornecedores sem token retorna 401
    Dado que nenhum token é enviado
    Quando faço GET em /api/v1/suppliers sem autenticação
    Então o status da resposta é 401

  # bru: suppliers/02-list-bare-user-403.bru (seq 11) — GET {{baseUrl}}/api/v1/suppliers — token: bareUser
  Cenário: CA2 — usuário sem permissão é barrado na listagem
    Dado um usuário pelado sem permissão autenticado
    Quando faço GET em /api/v1/suppliers com o token do usuário pelado
    Então o status da resposta é 403

  # bru: suppliers/03-create-supplier.bru (seq 12) — POST {{baseUrl}}/api/v1/suppliers — token: operator
  Cenário: CA3 — operador cria fornecedor
    Dado um operador autenticado e um corpo válido de fornecedor
    Quando faço POST em /api/v1/suppliers com o token do operador
    Então o status da resposta é 201
    E o header Location é string e contém "/api/v1/suppliers/"
    E o id criado é guardado em supplierCreatedId

  # bru: suppliers/04-get-supplier-by-id.bru (seq 13) — GET {{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}} — token: operator
  Cenário: CA3 — consultar fornecedor recém-criado por id
    Dado um fornecedor criado e identificado por supplierCreatedId
    Quando faço GET em /api/v1/suppliers/:id com o token do operador
    Então o status da resposta é 200
    E o id bate com o criado
    E o cnpj é "11222333000181"
    E active é true
    E os campos obrigatórios estão presentes (id, name, email, corporateName, fantasyName, serviceCategory)

  # bru: suppliers/05-list-contains-created.bru (seq 14) — GET {{baseUrl}}/api/v1/suppliers — token: operator
  Cenário: CA3 — a listagem contém o fornecedor criado
    Dado um fornecedor já criado
    Quando faço GET em /api/v1/suppliers com o token do operador
    Então o status da resposta é 200
    E a resposta tem items (array) e meta
    E a lista contém o fornecedor criado

  # bru: suppliers/06-deactivate-supplier.bru (seq 15) — POST {{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}}/deactivate — token: operator
  Cenário: CA4 — desativar o fornecedor
    Dado um fornecedor ativo
    Quando faço POST em /api/v1/suppliers/:id/deactivate com o token do operador
    Então o status da resposta é 200

  # bru: suppliers/07-reactivate-supplier.bru (seq 16) — POST {{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}}/reactivate — token: operator
  Cenário: CA4 — reativar o fornecedor
    Dado um fornecedor desativado
    Quando faço POST em /api/v1/suppliers/:id/reactivate com o token do operador
    Então o status da resposta é 200

  # bru: suppliers/08-update-supplier.bru (seq 17) — PUT {{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}} — token: operator
  Cenário: CA4 opcional — atualizar (PUT total) o fornecedor
    Dado um fornecedor existente e um corpo de atualização total
    Quando faço PUT em /api/v1/suppliers/:id com o token do operador
    Então o status da resposta é 200

  # bru: suppliers/09-export-csv.bru (seq 18) — GET {{baseUrl}}/api/v1/suppliers/export — token: operator
  Cenário: US-003 — operador exporta fornecedores em CSV
    Dado um operador com permissão de leitura de fornecedor autenticado
    Quando faço GET em /api/v1/suppliers/export com o token do operador
    Então o status da resposta é 200
    E o header content-type inclui "text/csv"
    E o header content-disposition inclui "attachment" e ".csv"
    E o header x-content-type-options é "nosniff"

  # bru: suppliers/10-service-categories.bru (seq 19) — GET {{baseUrl}}/api/v1/suppliers/service-categories — token: operator
  Cenário: US-004 — listar catálogo de categorias de serviço
    Dado um operador autenticado
    Quando faço GET em /api/v1/suppliers/service-categories com o token do operador
    Então o status da resposta é 200
    E o corpo é um array de strings
    E o catálogo tem 39 itens

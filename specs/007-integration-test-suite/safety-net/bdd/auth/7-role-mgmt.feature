# language: pt
Funcionalidade: Ciclo de vida de papéis (7-role-mgmt)
  Como administrador com role:create e role:update
  Quero criar, editar e desativar papéis com validação de catálogo e regra de papel-em-uso
  Para gerir o ciclo de vida do RBAC com integridade referencial

  # Captura 1:1 dos requests em api-collections/auth/7-role-mgmt/*.bru

  Cenário: US5 criar papel ok (captura newRoleId)
    Dado que estou autenticado como admin
    Quando faço POST /api/v1/roles com name "Gerente E2E" e permissions ["user:read","user:list"]
    Então recebo 201 (papel criado)
    E body.id é string não-vazia

  Cenário: US5 criar papel nome duplicado (409)
    Dado que estou autenticado como admin e o nome "Gerente E2E" já existe
    Quando faço POST /api/v1/roles com esse nome
    Então recebo 409

  Cenário: US5 criar papel permissao fora do catalogo (422)
    Dado que estou autenticado como admin
    Quando faço POST /api/v1/roles com permissions ["nao:existe"]
    Então recebo 422 (permissão fora do catálogo)

  Cenário: US5 criar papel nome invalido dominio (422)
    Dado que estou autenticado como admin
    Quando faço POST /api/v1/roles com name "   " (espaços que passam o Zod e caem no domínio)
    Então recebo 422 (nome inválido no domínio)

  Cenário: US5 criar papel sem token (401)
    Dado que não envio sessão
    Quando faço POST /api/v1/roles
    Então recebo 401

  Cenário: US5 criar papel sem role:create (403)
    Dado que estou autenticado como bare (sem role:create)
    Quando faço POST /api/v1/roles
    Então recebo 403

  Cenário: US6 editar papel renomear (200)
    Dado que estou autenticado como admin e o newRoleId
    Quando faço PUT /api/v1/roles/{newRoleId} com name "Gerente E2E Renomeado"
    Então recebo 200
    E body.name é "Gerente E2E Renomeado"
    E body.active permanece true

  Cenário: US6 editar papel substituir permissions (200)
    Dado que estou autenticado como admin e o newRoleId
    Quando faço PUT /api/v1/roles/{newRoleId} com permissions ["user:read"]
    Então recebo 200
    E body.permissions é array e contém "user:read"

  Cenário: US6 editar papel permissao fora do catalogo (422)
    Dado que estou autenticado como admin e o newRoleId
    Quando faço PUT /api/v1/roles/{newRoleId} com permissions ["nao:existe"]
    Então recebo 422 (permissão fora do catálogo)

  Cenário: US6 editar papel inexistente (404)
    Dado que estou autenticado como admin
    Quando faço PUT /api/v1/roles/{id-inexistente}
    Então recebo 404

  Cenário: US6 editar papel sem token (401)
    Dado que não envio sessão
    Quando faço PUT /api/v1/roles/{newRoleId}
    Então recebo 401

  Cenário: US6 editar papel sem role:update (403)
    Dado que estou autenticado como bare (sem role:update)
    Quando faço PUT /api/v1/roles/{newRoleId}
    Então recebo 403

  Cenário: US7 desativar papel nao-atribuido (200)
    Dado que estou autenticado como admin e o newRoleId não está atribuído a ninguém
    Quando faço PATCH /api/v1/roles/{newRoleId}/deactivate
    Então recebo 200
    E body.active é false

  Cenário: US7 me bare (re-captura bareUserId)
    Dado que estou autenticado como bare
    Quando faço GET /api/v2/auth/me
    Então recebo 200 com userId (string) re-capturando bareUserId

  Cenário: US7 criar papel para uso (captura inUseRoleId)
    Dado que estou autenticado como admin
    Quando faço POST /api/v1/roles com name "Em Uso E2E" e permissions ["user:read"]
    Então recebo 201 com id (string) capturando inUseRoleId

  Cenário: US7 atribuir papel em uso ao bare (200)
    Dado que estou autenticado como admin e o bareUserId e o inUseRoleId
    Quando faço POST /api/v1/users/{bareUserId}/roles com o inUseRoleId
    Então recebo 200 com assigned=true

  Cenário: US7 desativar papel em uso (409 role-in-use)
    Dado que o inUseRoleId está atribuído a um usuário
    Quando faço PATCH /api/v1/roles/{inUseRoleId}/deactivate
    Então recebo 409 (FR-012: papel em uso)

  Cenário: US7 revogar papel em uso (higiene, 200)
    Dado que estou autenticado como admin e o bareUserId possui o inUseRoleId
    Quando faço DELETE /api/v1/users/{bareUserId}/roles/{inUseRoleId}
    Então recebo 200 com revoked=true (limpeza)

  Cenário: US7 desativar papel sem token (401)
    Dado que não envio sessão
    Quando faço PATCH /api/v1/roles/{inUseRoleId}/deactivate
    Então recebo 401

  Cenário: US7 desativar papel sem role:update (403)
    Dado que estou autenticado como bare (sem role:update)
    Quando faço PATCH /api/v1/roles/{inUseRoleId}/deactivate
    Então recebo 403

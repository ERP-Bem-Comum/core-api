# language: pt
Funcionalidade: Atribuição e revogação de papéis (6-roles)
  Como administrador com user:assign-role
  Quero listar papéis, atribuí-los e revogá-los de usuários
  Para gerir o RBAC com propagação de permissões e anti-lockout

  # Captura 1:1 dos requests em api-collections/auth/6-roles/*.bru

  Cenário: US4 me bare (captura bareUserId)
    Dado que estou autenticado como bare
    Quando faço GET /api/v2/auth/me
    Então recebo 200 com userId (string) capturando bareUserId

  Cenário: US3 list roles admin (captura roleIds)
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/roles
    Então recebo 200 com items array
    E cada item tem id, name, active e permissions (array)
    E existe uma role de gestão com "user:assign-role"
    E existe uma role atribuível com permissions vazias

  Cenário: US3 list roles sem token
    Dado que não envio sessão
    Quando faço GET /api/v1/roles
    Então recebo 401

  Cenário: US3 list roles bare (sem role:read)
    Dado que estou autenticado como bare (sem role:read)
    Quando faço GET /api/v1/roles
    Então recebo 403

  Cenário: US4 assign role ao bare
    Dado que estou autenticado como admin e o bareUserId e o adminRoleId
    Quando faço POST /api/v1/users/{bareUserId}/roles com o roleId
    Então recebo 200 com assigned=true

  Cenário: US4 assign role idempotente
    Dado que o bare já possui o role atribuído
    Quando faço POST /api/v1/users/{bareUserId}/roles com o mesmo roleId
    Então recebo 200 com assigned=true (idempotente)

  Cenário: US4 confirma propagacao das permissoes
    Dado que o bare recebeu a role de gestão
    Quando faço GET /api/v1/users/{bareUserId}/permissions
    Então recebo 200 com permissions array
    E o bare herdou "user:assign-role" do role atribuído

  Cenário: US4 revoke role do bare
    Dado que estou autenticado como admin e o bareUserId possui o adminRoleId
    Quando faço DELETE /api/v1/users/{bareUserId}/roles/{adminRoleId}
    Então recebo 200 com revoked=true

  Cenário: US4 revoke role idempotente
    Dado que o role já foi revogado do bare
    Quando faço DELETE /api/v1/users/{bareUserId}/roles/{adminRoleId} novamente
    Então recebo 200 com revoked=true (idempotente)

  Cenário: US4 assign role sem token
    Dado que não envio sessão
    Quando faço POST /api/v1/users/{bareUserId}/roles
    Então recebo 401

  Cenário: US4 assign role bare (sem user:assign-role)
    Dado que estou autenticado como bare (sem user:assign-role)
    Quando faço POST /api/v1/users/{bareUserId}/roles com o assignableRoleId
    Então recebo 403

  Cenário: US4 auto-lockout (422 cannot-self-lockout)
    Dado que estou autenticado como admin
    Quando faço DELETE /api/v1/users/{adminUserId}/roles/{adminRoleId} sobre meu próprio role
    Então recebo 422 (FR-010: ator não se auto-bloqueia)

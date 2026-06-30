# language: pt
Funcionalidade: Catálogo de permissões e permissões efetivas (5-permissions)
  Como administrador com role:read
  Quero ler o catálogo imutável de permissões e as permissões efetivas de um usuário
  Para inspecionar o RBAC do sistema

  # Captura 1:1 dos requests em api-collections/auth/5-permissions/*.bru

  Cenário: US2 catalog admin
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/permissions
    Então recebo 200 com items array não-vazio
    E cada item tem id, resource e action
    E o catálogo não tem ids duplicados
    E inclui as âncoras "role:read" e "user:list"

  Cenário: US2 catalog sem token
    Dado que não envio sessão
    Quando faço GET /api/v1/permissions
    Então recebo 401

  Cenário: US2 catalog bare (sem role:read)
    Dado que estou autenticado como bare (sem role:read)
    Quando faço GET /api/v1/permissions
    Então recebo 403

  Cenário: US2 catalog read-only (POST 404)
    Dado que estou autenticado como admin
    Quando faço POST /api/v1/permissions tentando criar permissão
    Então recebo 404 (FR-011: catálogo imutável)

  Cenário: US1 me admin (captura adminUserId)
    Dado que estou autenticado como admin
    Quando faço GET /api/v2/auth/me
    Então recebo 200 com userId (string) capturando adminUserId

  Cenário: US1 user permissions admin
    Dado que estou autenticado como admin e o adminUserId
    Quando faço GET /api/v1/users/{adminUserId}/permissions
    Então recebo 200 com permissions array
    E as permissões efetivas incluem "role:read"

  Cenário: US1 user permissions inexistente
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users/{id-inexistente}/permissions
    Então recebo 404

  Cenário: US1 user permissions bare (sem role:read)
    Dado que estou autenticado como bare (sem role:read)
    Quando faço GET /api/v1/users/{adminUserId}/permissions
    Então recebo 403

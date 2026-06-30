# language: pt

# Dimensão: Consistência da informação (fonte única de verdade)
# Tipo: REGRESSÃO DE FIX — estes cenários descrevem o estado CORRETO e DEVEM REPROVAR
#       enquanto o bug existir. Pela política de regressão zero, ao rodá-los teremos
#       que corrigir o catálogo (ticket AUTH-PERMISSION-CATALOG-PARTNERS).
#
# Bug: src/modules/auth/domain/authorization/permission-catalog.ts ("FONTE ÚNICA de verdade
#      das permissions") tem 18 das 28 permissões — faltam as 10 do módulo partners
#      (supplier/financier/collaborator/act/geography × read/write), que as rotas de partners
#      exigem via authorize(...) e estão definidas em partners/public-api/permissions.ts.
#
# Fundamento canônico — Sam Newman, Building Microservices (p.194):
#   "DRY more accurately means that we want to avoid duplicating our system behavior and
#    knowledge. […] When you want to change behavior, and that behavior is duplicated in many
#    parts of your system, it is easy to forget everywhere you need to make a change, which can
#    lead to bugs." — O catálogo duplica (incompletamente) o conhecimento das permissões reais.

Funcionalidade: Catálogo de permissões é a fonte única e completa das permissões do sistema
  Como administrador de acessos
  Quero que o catálogo (GET /api/v1/permissions) liste TODAS as permissões que as rotas exigem
  Para poder conceder, via API, qualquer permissão que o sistema de fato verifica

  Contexto:
    Dado um administrador autenticado com a permissão "role:read"

  Cenário: CAT-REG-1 — catálogo expõe as permissões de Fornecedor (supplier)
    Quando o administrador faz GET /api/v1/permissions
    Então a resposta tem status 200
    E a lista de itens contém "supplier:read"
    E a lista de itens contém "supplier:write"

  Cenário: CAT-REG-2 — catálogo expõe Financiador, Colaborador, Ato e Geografia
    Quando o administrador faz GET /api/v1/permissions
    Então a resposta tem status 200
    E a lista contém "financier:read" e "financier:write"
    E a lista contém "collaborator:read" e "collaborator:write"
    E a lista contém "act:read" e "act:write"
    E a lista contém "geography:read" e "geography:write"

  Cenário: CAT-REG-3 — catálogo completo cobre as permissões usadas em produção
    Quando o administrador faz GET /api/v1/permissions
    Então a resposta tem status 200
    E para CADA permissão exigida por uma rota (auth, contracts, partners)
      existe um item correspondente no catálogo (consistência catálogo ↔ rotas)

  Cenário: CAT-REG-4 — criar papel com permissão de partners pela API
    Dado um administrador autenticado com a permissão "role:create"
    Quando ele faz POST /api/v1/roles com nome único e permissões ["supplier:read"]
    Então a resposta tem status 201 com o id do papel
    # Hoje REPROVA: retorna 422 "role-permission-not-in-catalog" (supplier:read fora do catálogo)

  Cenário: CAT-REG-5 — criar papel com múltiplas permissões de partners
    Dado um administrador autenticado com a permissão "role:create"
    Quando ele faz POST /api/v1/roles com nome único e permissões ["supplier:read", "geography:write"]
    Então a resposta tem status 201 com o id do papel
    # Hoje REPROVA: 422 (ambas fora do catálogo)

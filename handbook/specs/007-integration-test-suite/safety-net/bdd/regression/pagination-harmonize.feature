# language: pt

# Dimensão: Consistência da interface HTTP (contrato de paginação único)
# Tipo: REGRESSÃO DE FIX — estes cenários descrevem o estado CORRETO e DEVEM REPROVAR
#       até que o ticket HTTP-PAGINATION-HARMONIZE seja implementado.
#       PAGE-HARM-1 e PAGE-HARM-2 reprovam hoje; PAGE-HARM-3 já passa (guarda).
#
# Achado: 3 formatos de meta divergentes na borda HTTP:
#   - auth (users):    { currentPage, pageSize, totalItems, totalPages }  ← "pageSize" ≠ canônico
#   - partners:        { currentPage, itemsPerPage, itemCount, totalItems, totalPages } ← CANÔNICO
#   - contracts:       { page, limit, total, totalPages }  ← nomes curtos incompatíveis
#
# Shape canônico proposto (partners, mais completo):
#   { currentPage, itemsPerPage, itemCount, totalItems, totalPages }
#
# Referências:
#   - Ticket de fix: HTTP-PAGINATION-HARMONIZE
#   - Schema canônico: src/modules/partners/adapters/http/financier-schemas.ts:45
#   - Schemas divergentes: src/modules/contracts/adapters/http/schemas.ts:77
#                          src/modules/auth/adapters/http/users-schemas.ts:40
#   - Coleção .bru: api-collections/core-api/z-pending-fixes/pagination/

Funcionalidade: Toda listagem paginada retorna o mesmo shape de meta canônico
  Como cliente da API (front-end ou integração)
  Quero que todo endpoint de listagem paginada retorne meta com os campos
  currentPage, itemsPerPage, itemCount, totalItems e totalPages
  Para tratar a paginação de forma uniforme sem adaptadores por módulo

  Contexto:
    Dado que a infraestrutura (MySQL, MinIO, server) está pronta
    E os tokens de autenticação foram obtidos via 0-auth

  Cenário: PAGE-HARM-1 — GET /api/v2/contracts retorna meta com shape canônico
    Dado um usuário com permissão "contract:read" autenticado (contractsOperatorToken)
    Quando ele faz GET /api/v2/contracts com page=1 e limit=5
    Então a resposta tem status 200
    E body.meta tem a propriedade "currentPage"
    E body.meta tem a propriedade "itemsPerPage"
    E body.meta tem a propriedade "totalItems"
    E body.meta tem a propriedade "totalPages"
    # ESTADO ATUAL: REPROVA — contracts usa { page, limit, total, totalPages }

  Cenário: PAGE-HARM-2 — GET /api/v1/users retorna meta com shape canônico completo
    Dado um administrador autenticado (adminToken)
    Quando ele faz GET /api/v1/users com page=1 e pageSize=5
    Então a resposta tem status 200
    E body.meta tem a propriedade "currentPage"
    E body.meta tem a propriedade "itemsPerPage"
    E body.meta tem a propriedade "itemCount"
    E body.meta tem a propriedade "totalItems"
    E body.meta tem a propriedade "totalPages"
    # ESTADO ATUAL: REPROVA (parcialmente) — auth/users usa { currentPage, pageSize, totalItems, totalPages }
    # falta: "itemsPerPage" (usa "pageSize") e "itemCount"

  Cenário: PAGE-HARM-3 — GET /api/v1/suppliers já retorna meta canônico completo (guarda de não-regressão)
    Dado um usuário com permissão "supplier:read" autenticado (partnersOperatorToken)
    Quando ele faz GET /api/v1/suppliers com page=1 e limit=5
    Então a resposta tem status 200
    E body.meta tem a propriedade "currentPage"
    E body.meta tem a propriedade "itemsPerPage"
    E body.meta tem a propriedade "itemCount"
    E body.meta tem a propriedade "totalItems"
    E body.meta tem a propriedade "totalPages"
    # ESTADO ATUAL: PASSA — partners já conforme; este cenário é guarda para evitar regressão

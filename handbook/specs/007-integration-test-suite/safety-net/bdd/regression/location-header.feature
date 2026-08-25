# language: pt

# Dimensão: Conformidade com o protocolo HTTP/REST (RFC 7231 §6.3.2 / §7.1.2)
# Tipo: REGRESSÃO DE FIX — estes cenários descrevem o estado CORRETO e DEVEM REPROVAR
#       até que o ticket HTTP-LOCATION-HEADER-201 seja implementado.
#       LOC-1, LOC-2 e LOC-3 reprovam hoje; LOC-4 já passa (guarda de não-regressão).
#
# Achado: POST /api/v2/contracts, POST /api/v1/users e POST /api/v1/roles retornam
# 201 Created com { id } só no body, sem o header Location — violação de RFC 7231 §6.3.2
# ("The response SHOULD include a representation of the new resource's URI in the Location
# header field"). O módulo partners já está conforme (ver supplier-plugin.ts:192).
#
# Referências:
#   - Ticket de fix: HTTP-LOCATION-HEADER-201
#   - Padrão canônico: src/modules/partners/adapters/http/supplier-plugin.ts:192
#   - Coleção .bru: api-collections/core-api/z-pending-fixes/location/

Funcionalidade: Toda resposta 201 Created inclui header Location com a URI do recurso criado
  Como cliente da API (front-end ou integração)
  Quero que toda resposta 201 inclua o header Location com a URI canônica do recurso
  Para não precisar inferir a URI a partir do body (acoplamento frágil)

  Contexto:
    Dado que a infraestrutura (MySQL, MinIO, server) está pronta
    E os tokens de autenticação foram obtidos via 0-auth

  Cenário: LOC-1 — POST /api/v2/contracts retorna 201 com header Location
    Dado um usuário com permissão "contract:write" autenticado (contractsOperatorToken)
    Quando ele faz POST /api/v2/contracts com body válido mode=Pending
    Então a resposta tem status 201
    E a resposta tem o header "location" presente
    E o header "location" contém "/contracts/"
    # ESTADO ATUAL: REPROVA — contracts não retorna Location (só { id } no body)

  Cenário: LOC-2 — POST /api/v1/users retorna 201 com header Location
    Dado um administrador autenticado (adminToken)
    Quando ele faz POST /api/v1/users com body válido (name, cpf, email, telephone)
    Então a resposta tem status 201
    E a resposta tem o header "location" presente
    E o header "location" contém "/users/"
    # ESTADO ATUAL: REPROVA — auth/users não retorna Location

  Cenário: LOC-3 — POST /api/v1/roles retorna 201 com header Location
    Dado um administrador autenticado (adminToken)
    Quando ele faz POST /api/v1/roles com nome único e permissões válidas
    Então a resposta tem status 201
    E a resposta tem o header "location" presente
    E o header "location" contém "/roles/"
    # ESTADO ATUAL: REPROVA — auth/roles não retorna Location

  Cenário: LOC-4 — POST /api/v1/suppliers já retorna 201 com header Location (guarda de não-regressão)
    Dado um usuário com permissão "supplier:write" autenticado (partnersOperatorToken)
    Quando ele faz POST /api/v1/suppliers com body válido mínimo
    Então a resposta tem status 201
    E a resposta tem o header "location" presente
    E o header "location" contém "/api/v1/suppliers/"
    # ESTADO ATUAL: PASSA — partners já conforme; este cenário é guarda para evitar regressão

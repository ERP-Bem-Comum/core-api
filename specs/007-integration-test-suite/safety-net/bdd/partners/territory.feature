# language: pt
# Coleção: api-collections/partners — pasta territory/
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / módulo partners).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: Cobertura territorial (states e municipalities) do módulo partners
  Como suíte de integração do módulo partners
  Quero listar e alternar (toggle) estados e municípios parceiros, com validação e autorização
  Para garantir o contrato dos endpoints geográficos, a idempotência dos toggles e o tratamento de entradas inválidas

  # bru: territory/01-states-no-auth.bru (seq 50) — GET {{baseUrl}}/api/v1/partner-states — auth: none
  Cenário: US-002 — listar estados sem token retorna 401
    Dado que nenhum token é enviado
    Quando faço GET em /api/v1/partner-states sem autenticação
    Então o status da resposta é 401

  # bru: territory/02-states-bare-user-403.bru (seq 51) — GET {{baseUrl}}/api/v1/partner-states — token: bareUser
  Cenário: US-002 — usuário sem geography:read é barrado na listagem de estados
    Dado um usuário pelado sem permissão geography:read autenticado
    Quando faço GET em /api/v1/partner-states com o token do usuário pelado
    Então o status da resposta é 403

  # bru: territory/03-list-partner-states.bru (seq 52) — GET {{baseUrl}}/api/v1/partner-states — token: operator
  Cenário: US-002 — operador lista os 27 estados
    Dado um operador autenticado
    Quando faço GET em /api/v1/partner-states com o token do operador
    Então o status da resposta é 200
    E o corpo é um array de 27 UFs
    E cada item tem uf (string) e isPartner (boolean)

  # bru: territory/04-toggle-state-activate.bru (seq 53) — POST {{baseUrl}}/api/v1/partner-states/SP — token: operator
  Cenário: US-002 — ativar (toggle) o estado SP é idempotente e retorna o DTO
    Dado um operador autenticado
    Quando faço POST em /api/v1/partner-states/SP com o token do operador
    Então o status da resposta é 200
    E o corpo é um PartnerStateDto com uf "SP" e isPartner true

  # bru: territory/05-toggle-state-invalid-uf-400.bru (seq 54) — POST {{baseUrl}}/api/v1/partner-states/XX — token: operator
  Cenário: US-002 — toggle de UF inválida (XX) retorna 400
    Dado um operador autenticado
    Quando faço POST em /api/v1/partner-states/XX com o token do operador
    Então o status da resposta é 400
    E o corpo tem error com code e requestId

  # bru: territory/06-toggle-state-deactivate.bru (seq 55) — DELETE {{baseUrl}}/api/v1/partner-states/SP — token: operator
  Cenário: US-002 — desativar (toggle) o estado SP é idempotente
    Dado um operador autenticado
    Quando faço DELETE em /api/v1/partner-states/SP com o token do operador
    Então o status da resposta é 200

  # bru: territory/07-list-municipalities.bru (seq 56) — GET {{baseUrl}}/api/v1/partner-municipalities?uf=SP — token: operator
  Cenário: US-002 — listar municípios de SP
    Dado um operador autenticado
    Quando faço GET em /api/v1/partner-municipalities com uf=SP e o token do operador
    Então o status da resposta é 200
    E o corpo é um array não-vazio de municípios
    E cada um dos 3 primeiros municípios tem ibgeCode (string), uf igual a "SP", name e isPartner (boolean)
    E o ibgeCode do primeiro município tem 7 dígitos
    E o ibgeCode do primeiro município é guardado em sampleIbgeCode

  # bru: territory/08-toggle-municipality-activate.bru (seq 57) — POST {{baseUrl}}/api/v1/partner-municipalities/{{sampleIbgeCode}} — token: operator
  Cenário: US-002 — ativar (toggle) o município é idempotente e retorna o DTO
    Dado um operador autenticado e um sampleIbgeCode válido
    Quando faço POST em /api/v1/partner-municipalities/:ibgeCode com o token do operador
    Então o status da resposta é 200
    E o corpo é um PartnerMunicipalityDto com isPartner true e name do tipo string

  # bru: territory/09-toggle-municipality-invalid-code-400.bru (seq 58) — POST {{baseUrl}}/api/v1/partner-municipalities/0000000 — token: operator
  Cenário: US-002 — toggle de ibgeCode inválido (0000000) retorna 400
    Dado um operador autenticado
    Quando faço POST em /api/v1/partner-municipalities/0000000 com o token do operador
    Então o status da resposta é 400
    E o corpo tem error com code e requestId

  # bru: territory/10-toggle-municipality-deactivate.bru (seq 59) — DELETE {{baseUrl}}/api/v1/partner-municipalities/{{sampleIbgeCode}} — token: operator
  Cenário: US-002 — desativar (toggle) o município é idempotente
    Dado um operador autenticado e um sampleIbgeCode válido
    Quando faço DELETE em /api/v1/partner-municipalities/:ibgeCode com o token do operador
    Então o status da resposta é 200

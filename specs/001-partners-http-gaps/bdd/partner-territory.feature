# language: pt
Funcionalidade: Estados e Municípios parceiros (US-002, P1)
  Como gestor
  Quero marcar/desmarcar estados e municípios como parceiros
  Para definir a abrangência territorial, com a seleção persistida

  Contexto:
    Dado que existe uma sessão autenticada com a permissão "geography:write"
    E que a parceria territorial usa soft-delete (ADR-0001: active + deactivated_at)

  # CT-101 — marcar estado (caminho feliz, persistente)
  Cenário: Marcar uma UF como parceira
    Dado que "SP" não é parceira
    Quando faço "POST /api/v1/partner-states/SP"
    Então a resposta tem status 200
    E o corpo é { "uf": "SP", "isPartner": true }
    E uma nova consulta a "GET /api/v1/partner-states" mostra "SP" com isPartner true

  # CT-102 — desmarcar estado (soft-delete)
  Cenário: Desmarcar uma UF parceira
    Dado que "SP" é parceira
    Quando faço "DELETE /api/v1/partner-states/SP"
    Então a resposta tem status 200
    E "SP" passa a ter isPartner false
    E o registro persiste com active=false e deactivated_at preenchido (não é hard delete)

  # CT-103 — idempotência
  Cenário: Marcar uma UF já parceira
    Dado que "SP" já é parceira
    Quando faço "POST /api/v1/partner-states/SP" novamente
    Então a resposta tem status 200 (no-op, sem duplicata nem erro)

  # CT-104 — reativação (soft-delete reversível)
  Cenário: Remarcar uma UF previamente desmarcada
    Dado que "SP" foi desmarcada (active=false)
    Quando faço "POST /api/v1/partner-states/SP"
    Então "SP" volta a isPartner true (active=true, deactivated_at nulo)

  # CT-105 — identificador fora do catálogo (validação/segurança)
  Cenário: Marcar UF inexistente
    Dado o identificador "XX" (não está no catálogo das 27 UFs)
    Quando faço "POST /api/v1/partner-states/XX"
    Então a resposta tem status 400 ou 404
    E nenhum registro é criado

  # CT-106 — municípios cross-state
  Cenário: Municípios parceiros de UFs diferentes coexistem
    Dado que marquei um município de "AM" e um de "SP" como parceiros
    Quando consulto os municípios parceiros
    Então ambos aparecem, independentemente do filtro de UF (cross-state)

  # CT-107 — listagem reflete catálogo + parceria
  Cenário: Listar estados com flag de parceria
    Quando consulto "GET /api/v1/partner-states"
    Então recebo as 27 UFs, cada uma com "isPartner" (true/false)

  # CT-108 — segurança: escrita sem permissão
  Cenário: Toggle sem "geography:write"
    Dado uma sessão SEM "geography:write"
    Quando faço "POST /api/v1/partner-states/SP"
    Então a resposta tem status 403 com "requestId" no envelope

  # CT-109 — segurança: sem sessão
  Cenário: Toggle sem autenticação
    Dado nenhuma sessão válida
    Quando faço "POST /api/v1/partner-states/SP"
    Então a resposta tem status 401

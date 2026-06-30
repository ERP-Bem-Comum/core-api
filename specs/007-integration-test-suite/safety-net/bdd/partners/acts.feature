# language: pt
# Coleção: api-collections/partners — pasta acts/
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / módulo partners).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: Exportação CSV de atos (acts) do módulo partners
  Como suíte de integração do módulo partners
  Quero exportar atos em CSV e barrar quem não tem permissão act:read
  Para garantir que o endpoint de export respeita autorização e entrega arquivo seguro

  # bru: acts/01-export-csv.bru (seq 60) — GET {{baseUrl}}/api/v1/acts/export — token: operator
  Cenário: US-002 — operador exporta atos em CSV
    Dado um operador com permissão act:read autenticado
    Quando faço GET em /api/v1/acts/export com o token do operador
    Então o status da resposta é 200
    E o header content-type inclui "text/csv"
    E o header content-disposition inclui "attachment" e ".csv"
    E o header x-content-type-options é "nosniff"

  # bru: acts/02-export-csv-403.bru (seq 61) — GET {{baseUrl}}/api/v1/acts/export — token: bareUser
  Cenário: US-002 — usuário sem act:read é barrado no export de atos
    Dado um usuário pelado sem permissão act:read autenticado
    Quando faço GET em /api/v1/acts/export com o token do usuário pelado
    Então o status da resposta é 403

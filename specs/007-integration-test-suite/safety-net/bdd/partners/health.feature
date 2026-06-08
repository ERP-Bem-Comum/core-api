# language: pt
# Coleção: api-collections/partners — health-check de raiz
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / módulo partners).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: Saúde do servidor do módulo partners
  Como suíte de integração do módulo partners
  Quero confirmar que o servidor da API está no ar
  Para destravar os cenários que dependem de um backend respondendo

  # bru: health-check.bru (seq 1) — GET {{baseUrl}}/health — auth: none
  Cenário: CA1 — servidor está no ar
    Dado que o servidor da API está iniciado
    Quando faço GET em /health sem autenticação
    Então o status da resposta é 200

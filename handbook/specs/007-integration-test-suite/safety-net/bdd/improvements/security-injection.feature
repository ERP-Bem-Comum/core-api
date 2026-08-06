# language: pt
# Dimensão: Segurança da informação
# Fundamento canônico — OWASP AI Exchange:
#   "input validation and sanitization to reject or correct malicious (e.g. very large) content".
#   (atribuição: OWASP AI Exchange)
# Reforço (requirements-engineer): cada Cenário é um critério de aceitação testável
#   (Given-When-Then, Histórias de Usuário 4ª ed.).
# Status: MELHORIA (expande os 2 casos de injection existentes para entradas livres adicionais).

Funcionalidade: Resistência a injeção (SQLi/XSS) nas entradas livres
  Como guardião da borda HTTP
  Quero que payloads de SQLi e XSS sejam tratados como literais ou rejeitados (422)
  Para evitar vazamento, execução de payload ou 500 (input validation / sanitization)

  Cenário: SQLi no search de GET /api/v1/users é tratado como literal
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users com search contendo o payload "' OR 1=1--"
    Então recebo 200 (query parametrizada, sem 500)
    E o resultado é paginado com items array e meta.totalItems
    E não há vazamento de dados extras (o payload é tratado como literal de busca)

  Cenário: XSS em name de POST /api/v1/roles é escapado ou rejeitado
    Dado que estou autenticado como admin
    Quando faço POST /api/v1/roles com name contendo "<script>alert(1)</script>"
    Então recebo 201 com o name armazenado escapado OU recebo 422
    E a resposta não reflete o payload como script executável

  Cenário: XSS em name de POST /api/v1/users é escapado ou rejeitado
    Dado que estou autenticado como admin e um e-mail/CPF únicos
    Quando faço POST /api/v1/users com name contendo "<script>alert(1)</script>"
    Então recebo 201 com o name armazenado escapado OU recebo 422
    E a resposta não reflete o payload como script executável

  Cenário: SQLi no filtro de listagem de contracts é seguro
    Dado que estou autenticado com token de leitura de contracts
    Quando faço GET na listagem de contracts com um filtro contendo "' OR 1=1--"
    Então recebo 200 ou 422 (filtro tratado como literal, sem 500)
    E não há dump da base nem vazamento de registros fora do escopo

  Cenário: SQLi no filtro de listagem de partners é seguro
    Dado que estou autenticado como operator de partners
    Quando faço GET em /api/v1/suppliers com um filtro/busca contendo "' OR 1=1--"
    Então recebo 200 ou 422 (filtro tratado como literal, sem 500)
    E não há dump da base nem vazamento de registros fora do escopo

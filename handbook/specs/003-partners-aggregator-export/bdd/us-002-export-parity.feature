# language: pt
Funcionalidade: Paridade de export CSV dos parceiros
  Como gestor
  Quero exportar cada tipo de parceiro em CSV (como já faço com fornecedores)
  Para análise externa, com paridade entre os 4 tipos

  Contexto:
    Dado que estou autenticado com as permissões de leitura dos tipos

  Cenário: Export de colaboradores (reusa serializer existente)
    Dado colaboradores cadastrados
    Quando chamo GET "/api/v1/collaborators/export" com filtros da listagem
    Então recebo 200 com corpo CSV dos colaboradores que casam os filtros
    E os headers incluem text/csv, Content-Disposition attachment e X-Content-Type-Options nosniff

  Cenário: Export de financiadores (serializer novo)
    Dado financiadores cadastrados
    Quando chamo GET "/api/v1/financiers/export"
    Então recebo 200 com CSV dos financiadores (financier-csv.ts)

  Cenário: Export de atos (serializer novo)
    Dado atos cadastrados
    Quando chamo GET "/api/v1/acts/export"
    Então recebo 200 com CSV dos atos (act-csv.ts)

  Cenário: Escape anti-CSV-injection
    Dado um campo iniciando com "=", "+", "-" ou "@"
    Quando exporto qualquer tipo
    Então o valor é escapado (util compartilhado), sem fórmula ativa

  Cenário: Export vazio
    Dado nenhum registro do tipo
    Quando exporto
    Então recebo CSV só com o cabeçalho

  Cenário: RBAC por tipo
    Dado um token sem financier:read
    Quando chamo GET "/api/v1/financiers/export"
    Então recebo 403 (envelope)

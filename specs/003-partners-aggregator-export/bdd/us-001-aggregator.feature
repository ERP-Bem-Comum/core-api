# language: pt
Funcionalidade: Agregador de busca de parceiros (GET /api/v1/partners)
  Como consumidor do front (BFF)
  Quero um endpoint único de busca dos 4 tipos de parceiro
  Para popular o seletor de contratado sem fan-out de 4 GETs

  Contexto:
    Dado que estou autenticado com supplier:read, financier:read, collaborator:read e act:read
    E existem parceiros dos 4 tipos cadastrados

  Cenário: Lista todos os tipos (projeção plana, paginada)
    Quando chamo GET "/api/v1/partners"
    Então recebo 200 com { items: [{ type, id, name, document, active }], meta: { page, limit, total, totalPages } }
    E os itens incluem os 4 tipos
    E estão ordenados por (name, type, id)

  Cenário: Filtra por tipo
    Quando chamo GET "/api/v1/partners?type=supplier"
    Então todos os items têm type "supplier"

  Cenário: Busca por nome/documento
    Quando chamo GET "/api/v1/partners?search=<termo>"
    Então todos os items casam o termo em name OU document (case-insensitive)

  Cenário: type inválido é rejeitado
    Quando chamo GET "/api/v1/partners?type=cliente"
    Então recebo 400 (envelope)

  Cenário: Paginação coerente
    Quando chamo GET "/api/v1/partners?page=2&limit=10"
    Então meta reflete page=2, limit=10 e totalPages = ceil(total/10)
    E items traz a fatia correta

  Cenário: Safety cap (lista grande demais)
    Dado que a soma dos 4 readers excede 10.000 registros
    Quando chamo o agregador
    Então recebo 503 com code "partners-aggregate-too-large" (nunca OOM)

  Cenário: RBAC — falta uma das 4 reads
    Dado um token sem act:read
    Quando chamo GET "/api/v1/partners"
    Então recebo 403 (envelope)

  Cenário: Sem sessão
    Dado que não estou autenticado
    Quando chamo GET "/api/v1/partners"
    Então recebo 401 com requestId

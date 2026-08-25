# language: pt
# Dimensão: Falhas técnicas possíveis
# Fundamento canônico — OWASP AI Exchange:
#   "input validation and sanitization to reject or correct malicious (e.g. very large) content".
#   (atribuição: OWASP AI Exchange) — paginação fora dos limites é entrada a validar/corrigir.
# Reforço (tdd-strategist / Kent Beck): a rede é uma characterization suite; falhas surgem
#   nas bordas não-exercitadas (boundary). Cada Cenário fixa um valor de borda.
# Status: MELHORIA (há pageSize inválido isolado; faltam page=0, negativo, acima do máximo,
#   page além do total).

Funcionalidade: Boundary de paginação nunca causa 500
  Como guardião da borda HTTP
  Quero que valores de paginação fora dos limites sejam rejeitados (422) ou clamped de forma documentada
  Para que a borda nunca retorne 500 e o meta permaneça coerente

  Cenário: GET /api/v1/users com page=0 é rejeitado ou clamped, nunca 500
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users?page=0
    Então recebo 422 OU 200 com clamp documentado (page mínima)
    E nunca recebo 500
    E o meta é coerente (currentPage e totalItems presentes)

  Cenário: GET /api/v1/users com page=-1 é rejeitado ou clamped, nunca 500
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users?page=-1
    Então recebo 422 OU 200 com clamp documentado
    E nunca recebo 500
    E o meta é coerente

  Cenário: GET /api/v1/users com pageSize=99999 é rejeitado ou clamped, nunca 500
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users?pageSize=99999
    Então recebo 422 OU 200 com pageSize clamped ao máximo documentado
    E nunca recebo 500
    E items.length não excede o máximo documentado

  Cenário: GET /api/v1/users com page além do total retorna vazio coerente, nunca 500
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users?page=999999
    Então recebo 200 com items vazio
    E o meta reflete totalItems real e a página solicitada
    E nunca recebo 500

  Cenário: Boundary de paginação em listagem de contracts nunca causa 500
    Dado que estou autenticado com token de leitura de contracts
    Quando faço GET na listagem de contracts com page=0, page=-1, pageSize=99999 e page além do total
    Então cada caso retorna 422 ou clamp documentado, nunca 500
    E o meta permanece coerente

  Cenário: Boundary de paginação em listagem de partners nunca causa 500
    Dado que estou autenticado como operator de partners
    Quando faço GET /api/v1/suppliers com page=0, page=-1, pageSize=99999 e page além do total
    Então cada caso retorna 422 ou clamp documentado, nunca 500
    E o meta permanece coerente

# language: pt
Funcionalidade: Hardening de segurança (3-security)
  Como guardião da borda HTTP
  Quero rejeitar tokens forjados, injeções e escaladas de privilégio
  Para garantir comportamento fail-closed e parametrização segura

  # Captura 1:1 dos requests em api-collections/auth/3-security/*.bru

  Cenário: SEC token adulterado
    Dado um JWT inválido/forjado no header Authorization
    Quando faço GET /api/v1/users
    Então recebo 401 (verificação de assinatura)

  Cenário: SEC bearer vazio
    Dado um header Authorization "Bearer" sem token
    Quando faço GET /api/v1/users
    Então recebo 401

  Cenário: SEC SQL injection no search
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users com search contendo payload SQLi e pageSize=25
    Então recebo 200 sem 500 (query parametrizada)
    E o retorno permanece paginado com items array e meta.totalItems (sem dump da base)

  Cenário: SEC mass-assignment no create
    Dado que estou autenticado como admin e um e-mail único
    Quando faço POST /api/v1/users incluindo campos extras status/roles/adminId
    Então recebo 201 e os campos extras são ignorados (cria normal)

  Cenário: SEC escalada por permissao (bare cria)
    Dado que estou autenticado como bare (sem privilégio)
    Quando faço POST /api/v1/users
    Então recebo 403 (fail-closed)

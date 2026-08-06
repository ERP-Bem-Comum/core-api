# language: pt
Funcionalidade: Minha conta (4-me)
  Como usuário autenticado
  Quero ler, atualizar minha conta e solicitar reset de senha
  Para gerir meus próprios dados sem privilégios administrativos

  # Captura 1:1 dos requests em api-collections/auth/4-me/*.bru

  Cenário: US7 GET /me (minha conta)
    Dado que estou autenticado como admin seed
    Quando faço GET /api/v1/me
    Então recebo 200 com email "admin.e2e@bemcomum.dev"
    E a resposta não expõe passwordHash

  Cenário: US7 PUT /me (atualiza minha conta)
    Dado que estou autenticado como admin seed
    Quando faço PUT /api/v1/me com novo nome e telefone
    Então recebo 200 com name "Admin E2E" e telefone "15991110000"
    E o email é preservado ("admin.e2e@bemcomum.dev", patch semântico)
    E a resposta não expõe passwordHash

  Cenário: US7 POST /me/password-reset (solicita reset)
    Dado que estou autenticado como admin seed
    Quando faço POST /api/v1/me/password-reset
    Então recebo 202 Accepted (reset enfileirado)

# language: pt
Funcionalidade: Autenticação e sessão (1-auth)
  Como administrador do ERP Bem Comum
  Quero autenticar e inspecionar minha sessão
  Para obter um token e descobrir minhas permissões efetivas

  # Captura 1:1 dos requests em api-collections/auth/1-auth/*.bru

  Cenário: health check
    Dado que o servidor está no ar
    Quando faço GET /health
    Então recebo 200 com status "ok"

  Cenário: login admin
    Dado o e-mail do admin seed e a senha de ambiente E2E
    Quando faço POST /api/v2/auth/login com essas credenciais
    Então recebo 200 com um accessToken JWT (string com mais de 20 caracteres)
    E a resposta não expõe passwordHash

  Cenário: me admin (captura adminId)
    Dado que estou autenticado com o token do admin
    Quando faço GET /api/v2/auth/me
    Então recebo 200 com userId (string) e permissions (array)
    E as permissions incluem "user:create" e "user:deactivate"

  Cenário: login bare (sem permissions)
    Dado o e-mail do usuário bare e a senha de ambiente E2E
    Quando faço POST /api/v2/auth/login com essas credenciais
    Então recebo 200 com um accessToken (string)

  Cenário: login senha errada
    Dado o e-mail do admin com uma senha incorreta
    Quando faço POST /api/v2/auth/login
    Então recebo 401 por credencial inválida
    E o erro uniforme não revela se o e-mail existe (não contém "password")

  Cenário: login email inexistente
    Dado um e-mail que não existe na base
    Quando faço POST /api/v2/auth/login
    Então recebo 401 sem permitir enumeração de e-mails

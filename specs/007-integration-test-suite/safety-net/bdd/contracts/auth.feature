# language: pt
# Coleção: api-collections/contracts — pasta auth/ (+ health-check de raiz)
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / T005).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: Bootstrap e autenticação do módulo contracts
  Como suíte de integração do módulo contracts
  Quero que o servidor esteja no ar e que os atores (usuário pelado, reader, operator) autentiquem
  Para obter os tokens que destravam os cenários de contrato (write/read/forbidden)

  # bru: health-check.bru (seq 1) — GET {{baseUrl}}/health
  Cenário: CA1 — servidor está no ar
    Dado que o servidor da API está iniciado
    Quando faço GET em /health sem autenticação
    Então o status da resposta é 200

  # bru: auth/01-register-bare-user.bru (seq 2) — POST {{baseUrl}}/api/v2/auth/register
  Cenário: CA2 — registrar usuário pelado (sem permissões)
    Dado um e-mail de usuário pelado e a senha de seed
    Quando faço POST em /api/v2/auth/register sem autenticação
    Então o status da resposta é 201 (criado) ou 409 (se já existe)

  # bru: auth/02-login-bare-user.bru (seq 3) — POST {{baseUrl}}/api/v2/auth/login
  Cenário: CA2 — login do usuário pelado retorna token
    Dado um usuário pelado já registrado
    Quando faço POST em /api/v2/auth/login com suas credenciais
    Então o status da resposta é 200
    E o corpo contém accessToken do tipo string
    E o token é guardado em bareUserToken

  # bru: auth/03-login-reader.bru (seq 4) — POST {{baseUrl}}/api/v2/auth/login
  Cenário: CA3 — login do reader (contract:read) retorna token
    Dado um usuário reader com permissão contract:read
    Quando faço POST em /api/v2/auth/login com suas credenciais
    Então o status da resposta é 200
    E o corpo contém accessToken do tipo string
    E o token é guardado em readerToken

  # bru: auth/04-login-operator.bru (seq 5) — POST {{baseUrl}}/api/v2/auth/login
  Cenário: CA3 — login do operador (contract:write) retorna token
    Dado um usuário operador com permissão contract:write
    Quando faço POST em /api/v2/auth/login com suas credenciais
    Então o status da resposta é 200
    E o corpo contém accessToken do tipo string
    E o token é guardado em operatorToken

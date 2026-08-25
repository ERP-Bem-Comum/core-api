# language: pt
# Coleção: api-collections/partners — pasta auth/
# Rede de segurança 1:1 — captura de cobertura ANTES de reescrever a coleção (spec 007 / US1 / módulo partners).
# Fonte read-only: cada Cenário espelha exatamente UM request .bru. Não inventar asserções.

Funcionalidade: Bootstrap de autenticação do módulo partners
  Como suíte de integração do módulo partners
  Quero registrar e autenticar os atores (usuário pelado e operador)
  Para obter os tokens que destravam os cenários de parceiros (write/read/forbidden)

  # bru: auth/01-register-bare-user.bru (seq 2) — POST {{baseUrl}}/api/v2/auth/register — auth: none
  Cenário: CA2 — registrar usuário pelado (sem permissões)
    Dado um e-mail de usuário pelado e a senha de seed
    Quando faço POST em /api/v2/auth/register sem autenticação
    Então o status da resposta é 201 (criado) ou 409 (se já existe)

  # bru: auth/02-login-bare-user.bru (seq 3) — POST {{baseUrl}}/api/v2/auth/login — auth: none
  Cenário: CA2 — login do usuário pelado retorna token
    Dado um usuário pelado já registrado
    Quando faço POST em /api/v2/auth/login com suas credenciais
    Então o status da resposta é 200
    E o corpo contém accessToken do tipo string
    E o token é guardado em bareUserToken

  # bru: auth/03-login-operator.bru (seq 4) — POST {{baseUrl}}/api/v2/auth/login — auth: none
  Cenário: CA3 — login do operador retorna token
    Dado um usuário operador com as permissões de parceiro
    Quando faço POST em /api/v2/auth/login com suas credenciais
    Então o status da resposta é 200
    E o corpo contém accessToken do tipo string
    E o token é guardado em operatorToken

# language: pt
Funcionalidade: Gestão de usuários (2-users)
  Como administrador com permissões user:*
  Quero listar, criar, detalhar, atualizar, ativar/desativar usuários e gerir foto
  Para administrar o cadastro de pessoas com RBAC e validação na borda

  # Captura 1:1 dos requests em api-collections/auth/2-users/*.bru

  Cenário: US1 list sem token
    Dado que não envio sessão
    Quando faço GET /api/v1/users
    Então recebo 401 (fail-closed)

  Cenário: US1 list sem permissao (bare)
    Dado que estou autenticado como bare (sem user:list)
    Quando faço GET /api/v1/users
    Então recebo 403

  Cenário: US1 list admin
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users?pageSize=5
    Então recebo 200 com items (array) e meta com currentPage e totalItems
    E o item de lista não expõe cpf, telephone nem passwordHash

  Cenário: US1 list pageSize invalido
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users?pageSize=7
    Então recebo 400 por pageSize fora de {5,10,25} (validação Zod na borda)

  Cenário: US1 list busca por nome
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users?search=amanda&pageSize=10
    Então recebo 200 com shape paginado (items array)

  Cenário: US1 list filtro status
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users?status=active&pageSize=10
    Então recebo 200
    E todos os itens retornados têm status "active"

  Cenário: US1 list status invalido
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users?status=xpto
    Então recebo 400 por status fora do enum (Zod)

  Cenário: SEC list search excessivo
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users com search acima de 128 caracteres
    Então recebo 400 (anti-DoS no LIKE, rejeitado na borda)

  Cenário: US3 create sem token
    Dado que não envio sessão
    Quando faço POST /api/v1/users com um corpo válido
    Então recebo 401

  Cenário: US3 create sem permissao (bare)
    Dado que estou autenticado como bare (sem user:create)
    Quando faço POST /api/v1/users com um corpo válido
    Então recebo 403

  Cenário: US3 create admin
    Dado que estou autenticado como admin e um e-mail único por execução
    Quando faço POST /api/v1/users com nome, cpf, email e telefone
    Então recebo 201 com id (string)
    E a resposta mínima não contém passwordHash nem cpf

  Cenário: US3 create email duplicado
    Dado que estou autenticado como admin e um e-mail já registrado
    Quando faço POST /api/v1/users com esse e-mail
    Então recebo 409

  Cenário: US3 create cpf invalido
    Dado que estou autenticado como admin
    Quando faço POST /api/v1/users com cpf de checksum inválido
    Então recebo 422

  Cenário: US3 create email invalido
    Dado que estou autenticado como admin
    Quando faço POST /api/v1/users com e-mail mal formado
    Então recebo 422

  Cenário: US3 create body vazio
    Dado que estou autenticado como admin
    Quando faço POST /api/v1/users com corpo vazio
    Então recebo 400 por campos obrigatórios ausentes (Zod)

  Cenário: US2 detail admin
    Dado que estou autenticado como admin e um userId existente
    Quando faço GET /api/v1/users/{userId}
    Então recebo 200 com perfil completo cujo id é o userId e que tem massApprovalPermission
    E cpf "52998224725" e telefone "15997133502" normalizados (só dígitos)
    E o detalhe não expõe passwordHash

  Cenário: US2 detail id inexistente
    Dado que estou autenticado como admin
    Quando faço GET /api/v1/users/{id-valido-inexistente}
    Então recebo 404 sem vazar

  Cenário: US2 detail sem permissao (bare)
    Dado que estou autenticado como bare (sem user:read)
    Quando faço GET /api/v1/users/{userId}
    Então recebo 403 (IDOR bloqueado por RBAC)

  Cenário: US4 update nome/telefone
    Dado que estou autenticado como admin e um userId existente
    Quando faço PUT /api/v1/users/{userId} com novo nome e telefone
    Então recebo 200 com name "Amanda Souza" e telefone "15991111111"
    E os campos não enviados são preservados (cpf "52998224725")

  Cenário: US4 update email em conflito
    Dado que estou autenticado como admin
    Quando faço PUT /api/v1/users/{userId} trocando para o e-mail de outro usuário
    Então recebo 409

  Cenário: US4 update cpf invalido
    Dado que estou autenticado como admin
    Quando faço PUT /api/v1/users/{userId} com cpf inválido
    Então recebo 422 e nada persiste

  Cenário: US4 update id inexistente
    Dado que estou autenticado como admin
    Quando faço PUT /api/v1/users/{id-inexistente}
    Então recebo 404

  Cenário: US5 deactivate
    Dado que estou autenticado como admin e um userId ativo
    Quando faço PATCH /api/v1/users/{userId}/deactivate
    Então recebo 200 e o detalhe tem active=false

  Cenário: US5 deactivate idempotente
    Dado que estou autenticado como admin e um userId já desativado
    Quando faço PATCH /api/v1/users/{userId}/deactivate novamente
    Então recebo 200 e active permanece false (idempotente)

  Cenário: US5 activate
    Dado que estou autenticado como admin e um userId desativado
    Quando faço PATCH /api/v1/users/{userId}/activate
    Então recebo 200 e o detalhe tem active=true

  Cenário: US5 auto-desativacao (lockout)
    Dado que estou autenticado como admin
    Quando faço PATCH /api/v1/users/{adminId}/deactivate sobre minha própria conta
    Então recebo 422 (anti-lockout)

  Cenário: US5 activate id inexistente
    Dado que estou autenticado como admin
    Quando faço PATCH /api/v1/users/{id-inexistente}/activate
    Então recebo 404

  Cenário: US5 deactivate sem permissao (bare)
    Dado que estou autenticado como bare (sem user:deactivate)
    Quando faço PATCH /api/v1/users/{userId}/deactivate
    Então recebo 403 (fail-closed; simetria RBAC US5)

  Cenário: US6 upload foto (ok)
    Dado que estou autenticado como admin e um userId existente
    Quando faço PUT /api/v1/users/{userId}/photo?mimeType=image/jpeg com um arquivo
    Então recebo 200 com imageUrl (string não vazia)
    E a resposta não expõe passwordHash

  Cenário: US6 upload foto mime invalido (422)
    Dado que estou autenticado como admin
    Quando faço PUT /api/v1/users/{userId}/photo?mimeType=application/pdf com um arquivo
    Então recebo 422 por mime não suportado

  Cenário: US6 delete foto (ok)
    Dado que estou autenticado como admin e um userId com foto
    Quando faço DELETE /api/v1/users/{userId}/photo
    Então recebo 200 e imageUrl nula após delete

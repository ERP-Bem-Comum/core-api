# language: pt
Funcionalidade: Vínculo de parceiro (contratado) no contrato
  Como gestor de contratos
  Quero vincular o parceiro contratado a um contrato e ver seus dados no detalhe
  Para que o contrato não seja "solto" e a tela mostre quem foi contratado

  Contexto:
    Dado que estou autenticado com a permissão "contract:write"
    E existe a borda HTTP "/api/v2" do módulo contracts

  Cenário: Criar contrato com contratado válido
    Dado um parceiro do tipo "supplier" com id "11111111-1111-4111-8111-111111111111"
    Quando envio POST "/api/v2/contracts" com contractor { type: "supplier", id: "111...111" }
    Então recebo 201
    E a persistência grava contractor_type "supplier" e contractor_id "111...111"

  Cenário: Criação sem contratado é rejeitada
    Quando envio POST "/api/v2/contracts" sem o campo contractor
    Então recebo 400 com envelope de erro
    E nenhum contrato é criado

  Cenário: Detalhe de contrato com contratado Supplier inclui bancário/PIX
    Dado um contrato vinculado a um supplier existente em Parceiros
    Quando leio GET "/api/v2/contracts/:id" com permissão "contract:read"
    Então o detalhe inclui contractor.snapshot { name, document, bankAccount, pixKey, updatedAt }
    E a resposta declara os headers "Deprecation" e "Sunset"

  Cenário: Detalhe de contratado não-Supplier vem sem bancário/PIX
    Dado um contrato vinculado a um "financier" (ou "collaborator" ou "act")
    Quando leio o detalhe
    Então contractor.snapshot tem { name, document, updatedAt } sem bankAccount nem pixKey

  Cenário: Contratado do tipo Act é resolvido (paridade 4/4)
    Dado um contrato vinculado a um contratado do tipo "act"
    Quando o detalhe é composto
    Então o contractor-view.mapper resolve o ActView sem falhar por tipo não mapeado

  Cenário: Contratado ausente em Parceiros degrada com graça
    Dado um contrato cujo contractor_id não existe na public-api de Parceiros
    Quando leio o detalhe
    Então recebo contractor.snapshot = null
    E o status é 200 (nunca 500)
    E a resposta é indistinguível de uma falha de IO de Parceiros

  Cenário: Acesso sem sessão é negado
    Dado que não estou autenticado
    Quando crio ou leio um contrato
    Então recebo 401 com envelope contendo requestId

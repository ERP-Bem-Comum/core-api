# language: pt
Funcionalidade: Update de metadados do contrato (PATCH)
  Como gestor de contratos
  Quero editar os metadados de cadastro de um contrato
  Para corrigir informações sem violar a imutabilidade do valor e do período

  Contexto:
    Dado que estou autenticado com a permissão "contract:write"
    E existe um contrato com id "C-1"

  Cenário: Editar metadados válidos
    Quando envio PATCH "/api/v2/contracts/C-1" com { title: "Novo título", observations: "obs" }
    Então recebo 200
    E a leitura do detalhe reflete o novo title e observations

  Cenário: Campo imutável no corpo é rejeitado na borda
    Quando envio PATCH "/api/v2/contracts/C-1" com { originalValue: { cents: 500000 } }
    Então recebo 400 com envelope (chave não declarada — Zod .strict())
    E nada é alterado
    E o campo imutável não chega ao domínio

  Cenário: Corpo vazio é rejeitado
    Quando envio PATCH "/api/v2/contracts/C-1" com {}
    Então recebo 400 com envelope (schema exige pelo menos um campo)
    E não há no-op silencioso

  Cenário: Metadado obrigatório esvaziado é rejeitado
    Quando envio PATCH "/api/v2/contracts/C-1" com { title: "" }
    Então recebo 400 (regra min(1))

  Cenário: PATCH em contrato inexistente retorna 404
    Quando envio PATCH "/api/v2/contracts/C-INEXISTENTE"
    Então recebo 404 com code "contract-not-found"
    # Modelo RBAC puro: sem ownership por tenant — qualquer contract:write edita qualquer contrato existente

  Cenário: DELETE de contrato é recusado por imutabilidade
    Quando envio DELETE "/api/v2/contracts/C-1"
    Então recebo 405 com envelope code "contract-delete-forbidden"
    E a mensagem explica a política de imutabilidade (exclusão lógica, nunca física)

  Cenário: DELETE sem sessão não vaza existência da rota
    Dado que não estou autenticado
    Quando envio DELETE "/api/v2/contracts/C-1"
    Então recebo 401 antes de qualquer resposta de política

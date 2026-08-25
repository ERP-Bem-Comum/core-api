# language: pt
# Dimensão: Consistência da informação
# Fundamento canônico — Ramakrishnan & Gehrke, "Sistemas de Gerenciamento de Banco de Dados"
#   (3ª ed., p.443), §16.1 Propriedades ACID:
#   "Os usuários devem ser capazes de enxergar a execução de cada transação como atômica:
#    ou todas as ações são executadas ou nenhuma delas é executada."
#   (atribuição: Ramakrishnan & Gehrke, 3ª ed., p.443, §16.1)
# Reforço (requirements-engineer): cenário multi-passo que materializa o critério de aceitação
#   de FR-007 (propagação por referência) em Given-When-Then encadeado.
# Status: MELHORIA (há teste de unidade; falta o E2E encadeado de propagação referencial).

Funcionalidade: Propagação referencial de permissões ao editar role (FR-007)
  Como administrador de acessos
  Quero que editar as permissões de um role reflita imediatamente nas permissões efetivas de quem o tem
  Para garantir consistência por referência (não por cópia) na rede de segurança

  Cenário: Editar permissões de um role propaga para as permissões efetivas do usuário
    Dado que estou autenticado como admin
    E que crio um role via POST /api/v1/roles com a permissão P1 e capturo o roleId
    E que crio (ou seleciono) um usuário alvo e capturo o userId
    Quando atribuo o role ao usuário via POST /api/v1/users/:userId/roles
    E consulto GET /api/v1/users/:userId/permissions como baseline
    Então a baseline de permissões inclui P1
    Quando edito o role via PUT /api/v1/roles/:roleId trocando a permissão de P1 para P2
    E consulto novamente GET /api/v1/users/:userId/permissions
    Então as permissões efetivas do usuário incluem P2
    E as permissões efetivas do usuário NÃO incluem mais P1

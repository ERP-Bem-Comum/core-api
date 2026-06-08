# language: pt
# Dimensão: Consistência da informação
# Fundamento canônico — Ramakrishnan & Gehrke, "Sistemas de Gerenciamento de Banco de Dados"
#   (3ª ed., p.443), §16.1 Propriedades ACID:
#   "Os usuários devem ser capazes de enxergar a execução de cada transação como atômica:
#    ou todas as ações são executadas ou nenhuma delas é executada."
#   (atribuição: Ramakrishnan & Gehrke, 3ª ed., p.443, §16.1)
# Reforço (requirements-engineer): critério de aceitação testável de FR-009 (all-or-nothing
#   na edição) em Given-When-Then, com verificação de estado por leitura subsequente.
# Status: MELHORIA (há 409 de update isolado; falta provar que NENHUM campo do patch foi aplicado).

Funcionalidade: Atomicidade da edição de usuário (FR-009)
  Como administrador de usuários
  Quero que uma edição que falha não deixe estado parcial
  Para garantir all-or-nothing (atomicidade ACID) na borda HTTP

  Cenário: PUT que falha por email duplicado não aplica nenhum campo do patch
    Dado que estou autenticado como admin
    E que crio o usuário A com email "a@x" via POST /api/v1/users e capturo idA
    E que crio o usuário B com email "b@x" via POST /api/v1/users e capturo idB
    Quando faço PUT /api/v1/users/:idB trocando email para "a@x" e também alterando name e telefone
    Então recebo 409 (email em conflito)
    Quando faço GET /api/v1/users/:idB
    Então o email permanece "b@x"
    E o name permanece o original (patch não aplicado)
    E o telefone permanece o original (patch não aplicado)
    E nenhum campo do patch foi persistido (all-or-nothing)

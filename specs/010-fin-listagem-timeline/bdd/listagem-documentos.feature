# language: pt
Funcionalidade: Listagem de documentos financeiros com filtros e paginação
  Como Operador de Contas a Pagar ou Aprovador
  Quero listar documentos filtrando por situação, fornecedor, tipo e vencimento, com paginação
  Para enxergar a carteira de contas a pagar e localizar documentos rapidamente

  # CT-001 — filtro por situação (P1, US-001)
  Cenário: Listar apenas documentos em Aberto
    Dado que existem 3 documentos em "Aberto" e 2 em "Rascunho"
    Quando o usuário lista filtrando por situação "Aberto"
    Então recebe exatamente os 3 documentos em "Aberto"
    E o total informado é 3

  # CT-002 — paginação (P1, US-001)
  Cenário: Segunda página de um conjunto filtrado
    Dado que existem 25 documentos que satisfazem o filtro
    Quando o usuário pede a página 2 com 10 itens por página
    Então recebe os itens de 11 a 20
    E a resposta informa página 2, tamanho 10 e total 25

  # CT-003 — filtro por fornecedor (US-001)
  Cenário: Listar documentos de um fornecedor específico
    Dado documentos de fornecedores distintos
    Quando o usuário filtra pelo identificador de um fornecedor
    Então recebe apenas os documentos daquele fornecedor

  # CT-004 — janela de vencimento inclusiva (US-001)
  Cenário: Listar documentos com vencimento dentro de uma janela
    Dado documentos com vencimentos variados
    Quando o usuário filtra por uma janela de vencimento "de" e "até"
    Então recebe apenas os documentos com vencimento dentro da janela, incluindo os limites

  # CT-005 — conjunto vazio não é erro (edge case)
  Cenário: Nenhum documento satisfaz o filtro
    Dado que nenhum documento satisfaz o filtro informado
    Quando o usuário lista
    Então recebe uma lista vazia com total 0
    E a resposta é bem-sucedida (não é erro)

  # CT-006 — janela invertida (edge case)
  Cenário: Janela de vencimento com "de" maior que "até"
    Dado uma janela de vencimento com a data inicial maior que a final
    Quando o usuário lista
    Então recebe uma lista vazia (não é erro de servidor)

  # CT-007 — ref de filtro malformada (edge case)
  Cenário: Filtro de fornecedor com formato inválido
    Quando o usuário lista com um identificador de fornecedor que não é um UUID válido
    Então a requisição é rejeitada por validação na borda

  # CT-008 — autorização de leitura (US-001)
  Cenário: Usuário sem permissão de leitura financeira
    Dado um usuário autenticado sem a permissão de leitura financeira
    Quando ele tenta listar documentos
    Então o acesso é negado

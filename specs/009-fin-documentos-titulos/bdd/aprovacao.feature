# language: pt
Funcionalidade: Aprovação de documento com herança aos filhos e separação de funções
  Como Aprovador (perfil de governança)
  Quero aprovar um documento em Aberto
  Para autorizar o ciclo financeiro travando os campos vitais

  Contexto:
    Dado um documento "NFS-e" salvo com título pai e 3 títulos filhos em status "Aberto"

  # CT-011 — herança de aprovação (P1, US-003)
  Cenário: Aprovar o documento aprova o pai e todos os filhos
    Quando o Aprovador aprova o documento
    Então o título pai passa para status "Aprovado"
    E os 3 títulos filhos passam para status "Aprovado"
    E um evento "PayableApproved" é registrado para cada título

  # CT-012 — imutabilidade de campo vital (P1, US-003, R4)
  Cenário: Alterar valor após aprovação é rejeitado
    Dado que o documento está "Aprovado"
    Quando alguém tenta alterar o valor bruto ou o fornecedor
    Então a operação é rejeitada por campo vital imutável

  # CT-013 — edição permitida pós-aprovação (US-003, R5)
  Cenário: Alterar descrição e vencimento após aprovação é permitido
    Dado que o documento está "Aprovado"
    Quando o Aprovador altera apenas a descrição e a data de vencimento
    Então a alteração é aceita sem necessidade de reabertura

  # CT-014 — separação de funções (P1, US-003)
  Cenário: Operador não pode aprovar
    Dado um usuário com perfil de Operador, sem a permissão "payable:approve"
    Quando ele tenta aprovar o documento
    Então a operação é negada por falta de permissão

  # CT-015 — transição inválida (borda)
  Cenário: Aprovar um documento em Rascunho é rejeitado
    Dado um documento em status "Rascunho"
    Quando o Aprovador tenta aprovar o documento
    Então a operação é rejeitada com o erro "invalid-state-transition"

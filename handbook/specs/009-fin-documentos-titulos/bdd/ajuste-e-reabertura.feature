# language: pt
Funcionalidade: Ajuste em Aberto e desfazimento de aprovação
  Como Operador ou Aprovador
  Quero ajustar lançamentos em Aberto e desfazer aprovações
  Para corrigir valores antes ou depois da aprovação, mantendo a integridade fiscal

  # CT-016 — ajuste em Aberto recalcula (P2, US-004)
  Cenário: Ajustar imposto e juros em Aberto recalcula o líquido e o filho
    Dado uma NFS-e em "Aberto" com valor líquido de R$ 775,00 e um filho ISS de R$ 50,00
    Quando o Operador reduz o ISS para R$ 40,00 e adiciona R$ 5,00 de juros
    Então o valor líquido passa a R$ 790,00
    E o título filho de ISS passa a refletir R$ 40,00

  # CT-017 — ajuste bloqueado após aprovação (US-004)
  Cenário: Ajustar valor de documento aprovado é rejeitado
    Dado um documento em status "Aprovado"
    Quando o Operador tenta ajustar o valor bruto
    Então a operação é rejeitada

  # CT-018 — desfazer aprovação (P2, US-005)
  Cenário: Desfazer a aprovação retorna o documento para Aberto
    Dado um documento em status "Aprovado" e não transmitido
    Quando o Aprovador desfaz a aprovação
    Então o título pai e os filhos voltam para status "Aberto"
    E um evento "ApprovalUndone" é registrado

  # CT-019 — hard delete de filhos quando valores mudam (US-005, R8.1)
  Cenário: Reaprovar após mudar valores recria os filhos
    Dado um documento reaberto cujo valor bruto foi alterado
    Quando o documento é aprovado novamente
    Então os títulos filhos anteriores são excluídos fisicamente
    E novos títulos filhos são gerados com os valores atualizados

  # CT-020 — filhos reaproveitados quando valores não mudam (US-005, R8.1)
  Cenário: Reaprovar sem mudar valores reaproveita os filhos
    Dado um documento reaberto sem alteração de valores
    Quando o documento é aprovado novamente
    Então os títulos filhos são reaproveitados, apenas reaprovados

  # CT-021 — edição granular do filho (borda, R9)
  Cenário: Alterar valor de um título filho é rejeitado
    Dado um título filho em "Aberto"
    Quando o Operador tenta alterar o valor ou o favorecido do filho
    Então a operação é rejeitada
    E apenas a descrição e a data de vencimento do filho são editáveis

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

  # CT-017a — edição do Aprovado sem desfazer a aprovação (#1057, revisão da FR-008)
  Cenário: Corrigir descrição, forma de pagamento e categorização de um documento aprovado
    Dado um documento em status "Aprovado" cujo título pai está em Boleto
    Quando o Operador troca a forma para PIX, a categorização e a descrição
    Então o documento continua em status "Aprovado"
    E o título pai passa a PIX, sem o código de barras
    E os títulos de imposto passam a ter a nova categorização e mantêm a forma deles
    E o Histórico registra o autor e o antes → depois de cada campo

  # CT-017b — a forma muda uma vez só depois de aprovado (#1057)
  Cenário: Segunda troca de forma depois da aprovação é rejeitada
    Dado um documento "Aprovado" cuja forma do título pai já foi trocada depois da aprovação
    Quando o Operador tenta trocar a forma de novo, inclusive de volta para Boleto
    Então a operação é rejeitada

  # CT-017c — código de barras não se edita (#1057)
  Cenário: Alterar o código de barras de um Boleto aprovado é rejeitado
    Dado um documento "Aprovado" cujo título pai está em Boleto com código de barras
    Quando o Operador tenta trocar o código de barras mantendo a forma Boleto
    Então a operação é rejeitada
    Mas uma Guia de recolhimento lançada sem código pode receber o código no título pai

  # CT-017d — título transmitido não troca a forma (#1057)
  Cenário: Trocar a forma de um título transmitido é rejeitado
    Dado um documento "Aprovado" cujo título pai está "Transmitido" ou preso em remessa
    Quando o Operador tenta trocar a forma de pagamento
    Então a operação é rejeitada
    Mas a descrição e a categorização continuam editáveis

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

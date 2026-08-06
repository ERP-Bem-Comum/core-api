# language: pt
Funcionalidade: Controle de edição concorrente (optimistic lock)
  Como o sistema financeiro
  Quero rejeitar operações que usam uma versão desatualizada do documento
  Para impedir que edições/aprovações concorrentes sobrescrevam silenciosamente o trabalho de outro usuário

  # CT-018 — conflito de versão no ajuste (FR-009, MF-007)
  Cenário: Ajustar com versão desatualizada é rejeitado
    Dado um documento em "Aberto" na versão 1
    E que outro usuário já o alterou para a versão 2
    Quando o Operador tenta ajustar informando a versão 1
    Então a operação é rejeitada por conflito de versão
    E o documento não é alterado pela operação rejeitada

  # CT-019 — aprovação com versão atual prossegue (FR-009)
  Cenário: Aprovar com a versão correta é aceito
    Dado um documento em "Aberto" na versão atual
    Quando o Aprovador aprova informando a versão atual
    Então a aprovação é aplicada
    E a versão do documento é incrementada

  # CT-020 — conflito de versão ao desfazer aprovação (FR-009)
  Cenário: Desfazer aprovação com versão desatualizada é rejeitado
    Dado um documento "Aprovado" cuja versão avançou após uma alteração concorrente
    Quando o Aprovador tenta desfazer a aprovação informando uma versão antiga
    Então a operação é rejeitada por conflito de versão

  # CT-021 — aprovação concorrente dupla (NFR-004)
  Cenário: Dois aprovadores tentam aprovar a mesma versão
    Dado dois aprovadores que leem o mesmo documento na versão 1
    Quando ambos tentam aprovar informando a versão 1
    Então apenas a primeira aprovação é aplicada
    E a segunda é rejeitada por conflito de versão

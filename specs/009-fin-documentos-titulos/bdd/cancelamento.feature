# language: pt
Funcionalidade: Cancelamento de documento em Aberto
  Como Operador
  Quero cancelar um documento que ainda está em Aberto
  Para remover lançamentos equivocados antes da aprovação

  # CT-022 — cancelamento em Aberto (P3, US-006)
  Cenário: Cancelar documento em Aberto remove pai e filhos
    Dado um documento "NFS-e" em status "Aberto" com título pai e filhos
    Quando o Operador cancela o documento
    Então o documento e todos os títulos vinculados são excluídos fisicamente
    E um evento "DocumentCancelled" é registrado na outbox

  # CT-023 — cancelamento bloqueado fora de Aberto (US-006, R6)
  Cenário: Cancelar documento aprovado é rejeitado
    Dado um documento cujo título já está "Aprovado"
    Quando o Operador tenta cancelar o documento
    Então a operação é rejeitada com o erro "cancel-not-allowed"

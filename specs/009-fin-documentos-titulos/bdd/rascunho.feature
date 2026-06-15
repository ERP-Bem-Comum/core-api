# language: pt
Funcionalidade: Rascunho e submissão de documento
  Como Operador
  Quero salvar um documento incompleto como rascunho e submetê-lo depois
  Para não perder o trabalho em andamento

  # CT-024 — salvar rascunho parcial (P3, US-007)
  Cenário: Salvar rascunho parcial persiste sem validação plena
    Dado um documento com dados parciais
    Quando o Operador salva como rascunho
    Então o documento é persistido em status "Rascunho"
    E um evento "DocumentDraftSaved" é registrado
    E nenhum título é gerado ainda

  # CT-025 — submeter rascunho completo (US-007)
  Cenário: Submeter rascunho completo promove para Aberto e gera títulos
    Dado um rascunho com todos os campos obrigatórios preenchidos
    Quando o Operador submete o rascunho
    Então o documento passa para status "Aberto"
    E os títulos (pai e filhos quando aplicável) são gerados

  # CT-026 — submeter rascunho incompleto (borda, US-007)
  Cenário: Submeter rascunho incompleto é rejeitado
    Dado um rascunho sem campos obrigatórios preenchidos
    Quando o Operador tenta submeter o rascunho
    Então a submissão é rejeitada por campos obrigatórios ausentes

# language: pt
Funcionalidade: Trilha por-campo (Time Travel) do documento e seus títulos
  Como Aprovador ou auditor com leitura financeira
  Quero consultar o histórico imutável por-campo de um documento — quem, quando, valor anterior → novo
  Para auditar todo o ciclo de vida do Fato Gerador e seus títulos

  # CT-009 — registro automático na criação (P2, US-002)
  Cenário: Criar um documento gera a entrada inicial da trilha
    Dado um documento recém-criado em "Aberto"
    Quando consulto a trilha do documento
    Então existe uma entrada de criação com alvo "Documento"
    E os campos iniciais constam registrados

  # CT-010 — diff de campo no ajuste (US-002)
  Cenário: Ajustar o valor bruto registra a mudança de campo
    Dado um documento em "Aberto" com valor bruto conhecido
    Quando o Operador ajusta o valor bruto
    Então a trilha passa a conter a mudança do campo de valor bruto, do anterior para o novo
    E a mudança do valor líquido recalculado também consta

  # CT-011 — transição de estado na aprovação (US-002)
  Cenário: Aprovar registra a transição de estado com autor
    Dado um documento em "Aberto"
    Quando o Aprovador o aprova
    Então a trilha contém uma transição de estado de "Aberto" para "Aprovado"
    E a entrada registra o autor (aprovador) e o instante

  # CT-012 — append-only ao desfazer aprovação (US-002)
  Cenário: Desfazer a aprovação preserva o histórico anterior
    Dado um documento aprovado cuja aprovação é desfeita
    Quando consulto a trilha
    Então as entradas anteriores permanecem (nada é apagado)
    E há uma nova entrada com a transição de "Aprovado" para "Aberto"

  # CT-013 — atomicidade: trilha na mesma transação (NFR-001, SC-004)
  Cenário: Falha ao persistir não deixa documento sem trilha
    Dado que a gravação do documento e da sua trilha ocorre na mesma transação
    Quando a transação falha após salvar o documento mas antes da trilha
    Então nada é persistido (nem documento, nem trilha) — sem entrada órfã

  # CT-014 — cronologia da consulta (US-002)
  Cenário: A trilha é retornada em ordem cronológica
    Dado um documento criado, ajustado e aprovado em sequência
    Quando consulto a trilha
    Então as entradas vêm em ordem crescente de instante
    E cada entrada traz sua lista de mudanças de campo

  # CT-015 — documento inexistente (edge case)
  Cenário: Consultar a trilha de um documento que não existe
    Quando consulto a trilha de um identificador inexistente
    Então recebo "não encontrado"

  # CT-016 — autorização de leitura (US-002)
  Cenário: Usuário sem leitura financeira consulta a trilha
    Dado um usuário sem a permissão de leitura financeira
    Quando ele consulta a trilha de um documento
    Então o acesso é negado

  # CT-017 — boundary no cancelamento (SC-006)
  Cenário: Cancelar um documento em Aberto remove sua trilha em cascata
    Dado um documento em "Aberto" com trilha registrada
    Quando o documento é cancelado (hard delete)
    Então a trilha do documento é removida junto (faz parte do boundary do agregado)
    E o registro permanente do cancelamento permanece no evento de domínio

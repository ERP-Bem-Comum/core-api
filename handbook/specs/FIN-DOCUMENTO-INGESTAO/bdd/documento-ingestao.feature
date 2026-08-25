Feature: Inclusão de Documento com OCR
  Como Operador de Contas a Pagar
  Quero fazer upload de um PDF e ver os dados preenchidos automaticamente
  Para economizar tempo e reduzir erros de digitação

  Background:
    Given o fornecedor "Bambu Educação" está cadastrado com CNPJ "37.364.305/0001-92"
    And a tabela de alíquotas da SEFIN Fortaleza está carregada
    And o operador está logado no módulo Financeiro > Contas a Pagar

  # ───────────────────────────────────────────────
  # Cenário 1: Upload de NFS-e com OCR bem-sucedido
  # ───────────────────────────────────────────────
  Scenario: Upload de PDF de NFS-e e extração OCR
    Given o operador seleciona o arquivo "NFS-e_2026_0847.pdf"
    When o sistema processa o OCR
    Then o campo "tipo" deve ser preenchido com "NFS-e"
    And o campo "numero" deve ser preenchido com "0847"
    And o campo "serie" deve ser preenchido com "A1"
    And o campo "fornecedor" deve ser preenchido com "Bambu Educação"
    And o campo "cnpj" deve ser preenchido com "37.364.305/0001-92"
    And o campo "valor_bruto" deve ser preenchido com "R$ 10.000,00"
    And o campo "data_emissao" deve ser preenchido com "02/05/2026"
    And o campo "competencia" deve ser preenchido com "05/2026"
    And o campo "ISS" deve ser preenchido com "R$ 350,00"
    And o campo "IRRF" deve ser preenchido com "R$ 150,00"
    And o campo "INSS" deve ser preenchido com "R$ 1.100,00"
    And o preview do PDF deve ser exibido ao lado do formulário

  # ───────────────────────────────────────────────
  # Cenário 2: Cálculo automático do valor líquido
  # ───────────────────────────────────────────────
  Scenario: Cálculo do líquido para NFS-e
    Given o operador preencheu os campos fiscais:
      | campo           | valor        |
      | valor_bruto     | R$ 10.000,00 |
      | descontos_fonte | R$ 0,00      |
      | ISS             | R$ 350,00    |
      | IRRF            | R$ 150,00    |
      | INSS            | R$ 1.100,00  |
      | PIS             | R$ 65,00     |
      | COFINS          | R$ 300,00    |
      | CSLL            | R$ 100,00    |
    When o sistema calcula o valor líquido
    Then o campo "valor_liquido" deve exibir "R$ 7.935,00"
    And a sidebar deve exibir o título pai com valor "R$ 7.935,00"
    And a sidebar deve exibir os títulos filhos:
      | tipo | destinatário       | valor       |
      | ISS  | SEFIN Fortaleza    | R$ 350,00   |
      | IRRF | Receita Federal    | R$ 150,00   |
      | INSS | Receita Federal    | R$ 1.100,00 |
      | CSRF | Receita Federal    | R$ 465,00   |

  # ───────────────────────────────────────────────
  # Cenário 3: Divergência de alíquota ISS
  # ───────────────────────────────────────────────
  Scenario: Detecção e resolução de divergência de alíquota
    Given o OCR extraiu ISS de "R$ 350,00" (3,5%)
    And a alíquota padrão da SEFIN Fortaleza para o código "01.05" é 5,0%
    When o operador tenta salvar o documento
    Then o sistema exibe o modal "Alíquota ISS Divergente"
    And o modal exibe:
      | campo              | valor        |
      | padrao_sefin       | R$ 500,00    |
      | no_documento       | R$ 350,00    |
      | diferenca          | R$ 150,00    |
    When o operador seleciona "Aceitar o documento (R$ 350,00)"
    And clica em "Confirmar escolha"
    Then o documento é salvo com ISS = "R$ 350,00"
    And a divergência é registrada na trilha de auditoria

  # ───────────────────────────────────────────────
  # Cenário 4: Lançamento manual sem PDF
  # ───────────────────────────────────────────────
  Scenario: Lançamento manual de Recibo sem upload
    Given o operador clica em "+ Novo Documento"
    And seleciona o tipo "Recibo"
    When preenche manualmente:
      | campo           | valor                      |
      | fornecedor      | Tech Consultoria S/S       |
      | valor_bruto     | R$ 5.000,00                |
      | data_emissao    | 10/06/2026                 |
      | data_vencimento | 20/06/2026                 |
      | descricao       | Serviços de TI - junho/2026|
    And clica em "Salvar Documento"
    Then o sistema cria 1 título pai de "R$ 5.000,00"
    And não cria títulos filhos
    And o status do título é "Aberto"

  # ───────────────────────────────────────────────
  # Cenário 5: Auto-save de rascunho
  # ───────────────────────────────────────────────
  Scenario: Auto-save funciona durante preenchimento
    Given o operador está preenchendo o formulário de NFS-e
    When altera o campo "descricao" para "Consultoria técnica · maio/2026"
    And aguarda 2 segundos
    Then o status inferior exibe "Auto-salvo · há um instante"
    And o rascunho está persistido no backend
    When o operador recarrega a página
    Then o campo "descricao" mantém o valor "Consultoria técnica · maio/2026"

  # ───────────────────────────────────────────────
  # Cenário 6: Grid de Contas a Pagar - Busca
  # ───────────────────────────────────────────────
  Scenario: Busca por fornecedor no grid
    Given existem 47 documentos no grid
    And 3 documentos do fornecedor "Bambu Educação"
    When o operador digita "Bambu" na busca
    Then o grid exibe apenas 3 documentos
    And todos têm o fornecedor "Bambu Educação"

  # ───────────────────────────────────────────────
  # Cenário 7: Grid - Ação de Baixar (pagamento manual)
  # ───────────────────────────────────────────────
  Scenario: Baixar documento manualmente no grid
    Given o documento "NFS-e 0847" está no status "Aprovado"
    And o operador seleciona o documento no grid
    When clica em "Baixar" na barra de ações em lote
    Then o status do título muda para "Pago"
    And o documento aparece na lista de conciliação pendente
    And a forma de pagamento é marcada como "Manual"

  # ───────────────────────────────────────────────
  # Cenário 8: Grid - Alterar Vencimento em Lote
  # ───────────────────────────────────────────────
  Scenario: Alterar vencimento de múltiplos títulos em lote
    Given o operador selecionou 5 documentos no grid
    And todos os documentos selecionados estão nos status "Aberto" ou "Aprovado"
    When clica em "Alterar Vencimento"
    And informa a nova data "20/07/2026"
    And confirma a alteração
    Then o vencimento dos 5 títulos selecionados é atualizado para "20/07/2026"
    And cada alteração é registrada na trilha de auditoria
    And o sistema exibe toast de confirmação

  Scenario: Tentativa de alterar vencimento de título Transmitido
    Given o operador selecionou 3 documentos no grid
    And 2 documentos estão no status "Aberto"
    And 1 documento está no status "Transmitido"
    When clica em "Alterar Vencimento"
    Then o sistema exibe erro: "cannot-change-due-date-transmitted-or-beyond"
    And a ação é bloqueada

  # ───────────────────────────────────────────────
  # Cenário 9: Cancelamento permitido apenas em Aberto
  # ───────────────────────────────────────────────
  Scenario: Tentativa de cancelar documento Aprovado
    Given o documento "NFS-e 0847" está no status "Aprovado"
    When o operador tenta cancelar o documento
    Then o sistema exibe erro: "cannot-cancel-approved-document"
    And o documento permanece no status "Aprovado"

  # ───────────────────────────────────────────────
  # Cenário 10: Grid - Exportar CSV
  # ───────────────────────────────────────────────
  Scenario: Exportar documentos selecionados para CSV
    Given o operador selecionou 5 documentos no grid
    When clica em "Exportar CSV"
    Then o sistema gera um arquivo CSV com 5 linhas
    And o cabeçalho contém: Tipo, Documento, Fornecedor, Contrato, Forma Pag., Emissão, Vencimento, Bruto, Líquido, Status

  # ───────────────────────────────────────────────
  # Cenário 11: DANFE sem filhos
  # ───────────────────────────────────────────────
  Scenario: Lançamento de DANFE gera apenas título pai
    Given o operador faz upload de um DANFE
    And o OCR extrai ICMS "R$ 900,00", IPI "R$ 250,00"
    When o operador salva o documento
    Then o sistema gera apenas 1 título pai com status "Aberto"
    And o valor do título pai é igual ao valor bruto
    And não gera títulos filhos
    And os impostos ICMS e IPI ficam registrados apenas no documento

  # ───────────────────────────────────────────────
  # Cenário 12: Independência de pagamento entre pai e filhos
  # ───────────────────────────────────────────────
  Scenario: Pagamento do pai não paga os filhos automaticamente
    Given um documento NFS-e "0847" com título pai e 4 filhos (ISS, IRRF, INSS, CSRF)
    And todos os títulos estão no status "Aprovado"
    When o operador paga (baixa) apenas o título pai
    Then o status do título pai muda para "Pago"
    And os 4 títulos filhos permanecem no status "Aprovado"

  # ───────────────────────────────────────────────
  # Cenário 13: Busca por documento fiscal exibe pai e filhos
  # ───────────────────────────────────────────────
  Scenario: Busca por número de NFS-e exibe pai e filhos no grid
    Given um documento NFS-e "0847" foi salvo com título pai e 4 filhos
    When o operador busca no grid por "0847"
    Then o grid exibe o título pai
    And o grid exibe os 4 títulos filhos (ISS, IRRF, INSS, CSRF)

  # ───────────────────────────────────────────────
  # Cenário 14: Redirecionamento pós-salvamento
  # ───────────────────────────────────────────────
  Scenario: Salvar documento redireciona para grid com ordenação por mais recente
    Given o operador preencheu um novo documento NFS-e
    When o operador clica "Salvar Documento"
    Then o sistema persiste o documento e gera os títulos
    And o sistema redireciona para o grid de Contas a Pagar
    And a ordenação do grid está definida como "Mais recente"
    And o documento salvo aparece no topo da lista

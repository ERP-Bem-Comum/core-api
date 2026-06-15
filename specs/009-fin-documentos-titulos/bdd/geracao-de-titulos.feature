# language: pt
Funcionalidade: Geração automática de títulos a partir do documento (Fato Gerador)
  Como Operador de Contas a Pagar
  Quero salvar um documento fiscal ou não-fiscal
  Para que o sistema gere automaticamente os títulos a pagar com o valor líquido correto

  Contexto:
    Dado um fornecedor cadastrado identificado por "11111111-1111-4111-8111-111111111111"

  # CT-001 — caminho feliz não-fiscal (P1, US-001)
  Cenário: Boleto sem retenções gera um único título pai
    Dado um documento do tipo "Boleto" com valor bruto de R$ 1.000,00 e o fornecedor informado
    Quando o Operador salva o documento
    Então é criado 1 título pai de R$ 1.000,00 com status "Aberto"
    E nenhum título filho é criado
    E um evento "DocumentSaved" é registrado na outbox

  # CT-002 — desconto comercial (P1, US-001)
  Cenário: Fatura com desconto comercial reduz o líquido do título pai
    Dado um documento do tipo "Fatura" com valor bruto de R$ 5.000,00 e desconto de R$ 200,00
    Quando o Operador salva o documento
    Então o título pai tem valor líquido de R$ 4.800,00 com status "Aberto"

  # CT-003 — caminho feliz fiscal com retenções (P1, US-002)
  Cenário: NFS-e com retenções gera título pai mais um filho por imposto retido
    Dado um documento do tipo "NFS-e" com valor bruto de R$ 1.000,00
    E desconto na fonte de R$ 50,00
    E retenções ISS R$ 50,00, IRRF R$ 15,00 e INSS R$ 110,00
    Quando o Operador salva o documento
    Então o título pai tem valor líquido de R$ 775,00 com status "Aberto"
    E são criados 3 títulos filhos: ISS R$ 50,00, IRRF R$ 15,00 e INSS R$ 110,00
    E todos os filhos têm status "Aberto"

  # CT-004 — impostos registrados não entram no líquido (US-002, R1)
  Cenário: CBS e IBS são apenas registrados e não afetam o líquido
    Dado um documento do tipo "NFS-e" com valor bruto de R$ 1.000,00
    E impostos registrados CBS R$ 90,00 e IBS Municipal R$ 30,00
    Quando o Operador salva o documento
    Então CBS e IBS ficam registrados no documento
    E o valor líquido não é afetado por CBS nem por IBS
    E nenhum título filho é criado para CBS ou IBS

  # CT-005 — RPA (US-002)
  Cenário: RPA gera título pai mais filhos de IRRF, INSS e CSRF
    Dado um documento do tipo "RPA" com retenções IRRF, INSS e CSRF
    Quando o Operador salva o documento
    Então são criados 1 título pai e 3 títulos filhos (IRRF, INSS, CSRF)

  # CT-006 — DANFE não gera filhos (US-002)
  Cenário: DANFE registra impostos mas não gera filhos
    Dado um documento do tipo "DANFE" com ICMS, IPI, PIS e COFINS registrados
    Quando o Operador salva o documento
    Então é criado apenas 1 título pai
    E nenhum título filho é criado

  # CT-007 — fornecedor obrigatório (borda, US-001)
  Cenário: Salvar documento sem fornecedor é rejeitado
    Dado um documento do tipo "Boleto" sem fornecedor informado
    Quando o Operador tenta salvar o documento
    Então o salvamento é rejeitado por campo obrigatório ausente

  # CT-008 — líquido não-positivo (borda, edge case)
  Cenário: Documento cujo líquido seria não-positivo é rejeitado
    Dado um documento do tipo "NFS-e" cujas retenções e descontos zeram o valor líquido
    Quando o Operador tenta salvar o documento
    Então o salvamento é rejeitado com o erro "net-value-not-positive"

  # CT-009 — imposto incompatível com o tipo (borda, edge case)
  Cenário: Retenção em documento não-fiscal é rejeitada
    Dado um documento do tipo "Boleto" com uma retenção de ISS
    Quando o Operador tenta salvar o documento
    Então o salvamento é rejeitado com o erro "retention-not-allowed-for-type"

  # CT-010 — geração de filhos por tipo (variações tabeladas)
  Esquema do Cenário: Quantidade de filhos por tipo de documento
    Dado um documento do tipo "<tipo>" com "<retencoes>" retenções aplicáveis
    Quando o Operador salva o documento
    Então a quantidade de títulos filhos é "<filhos>"

    Exemplos:
      | tipo   | retencoes | filhos |
      | NFS-e  | 4         | 4      |
      | RPA    | 3         | 3      |
      | DANFE  | 0         | 0      |
      | Fatura | 0         | 0      |
      | Boleto | 0         | 0      |
      | Recibo | 0         | 0      |
      | Imposto| 0         | 0      |

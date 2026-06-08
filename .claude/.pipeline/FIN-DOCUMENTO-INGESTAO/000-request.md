# Request — FIN-DOCUMENTO-INGESTAO

## Título
Inclusão de Documento com OCR e Lançamento Manual

## Size
L

## Contexto
O Módulo Financeiro precisa de uma tela de inclusão de documento que permita:
1. **Upload de PDF** e leitura via OCR dos dados do documento fiscal/não-fiscal.
2. **Lançamento manual** quando não há PDF (inclusão direta dos campos).
3. **Preview do PDF** lado a lado com o formulário de lançamento.
4. **Cálculo automático** do valor líquido (bruto − descontos na fonte − retenções + juros/multa).
5. **Geração de títulos** (pai + filhos conforme tipo de documento).
6. **Validações fiscais** e sinalização de divergências de alíquota.
7. **Auto-save** de rascunho.
8. **Submissão para aprovação**.

## Tipos de Documento Suportados
- NFS-e (fiscal, gera filhos: ISS, IRRF, INSS, CSRF)
- DANFE (fiscal, apenas pai, registra ICMS/IPI/PIS/COFINS)
- RPA (fiscal, gera filhos: IRRF, INSS, CSRF)
- Fatura (fiscal, apenas pai)
- Boleto, Recibo, Imposto (não-fiscais, apenas pai)

## Escopo
- Tela de listagem (grid) de Contas a Pagar
- Tela de lançar documento (upload OCR + formulário)
- Motor de cálculo de retenções
- Auto-save de rascunho
- Geração de títulos pai e filhos
- Integração com cadastro de fornecedores
- Validação de alíquotas e sinalização de divergência

## Fora de Escopo
- Módulo de aprovação em si (já existe no pipeline como FIN-CLI-APROVAR-TITULO)
- Geração de remessa CNAB
- Conciliação bancária
- Gestão de plano orçamentário (apenas seleção do plano)

## Critérios de Aceitação
1. Operador pode fazer upload de PDF e o OCR extrai: tipo, número, fornecedor, CNPJ, valor bruto, retenções, data de emissão, competência.
2. Sistema calcula valor líquido automaticamente e exibe preview dos títulos previstos.
3. Se alíquota divergir do padrão, sistema exibe modal com 3 opções: aceitar, corrigir, solicitar nota corrigida.
4. Auto-save funciona a cada alteração de campo.
5. Ao salvar documento, sistema gera título pai + filhos (conforme tipo) em status Aberto.
6. Formas de pagamento: PIX, Boleto, TED, Transferência Bancária, Cartão Corporativo, Câmbio, Guia de Recolhimento, Outro.
7. Grid de Contas a Pagar permite busca, filtros, ordenação, ações em lote (mudar status, baixar, exportar).

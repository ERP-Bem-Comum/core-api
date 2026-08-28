// Erros do agregado Document — string literal union EN kebab-case (.claude/rules/domain.md).
// Cresce conforme as stories (aprovação, cancelamento, etc.).
export type DocumentError =
  | 'net-value-not-positive'
  | 'retention-not-allowed-for-type'
  | 'document-incomplete'
  | 'invalid-state-transition'
  // #223: baixa manual por título.
  | 'payable-not-found'
  | 'payable-not-approved'
  // #115: chave de acesso da DANFE.
  | 'invalid-access-key'
  | 'access-key-required-for-danfe'
  // #197: competência contábil.
  | 'invalid-competencia'
  // Complemento incompatível com a forma DO TÍTULO, nas rotas que pagam por código de barras
  // (boleto e guia). Ausente e malformado caem no mesmo erro de propósito: os dois terminam em
  // arquivo que o banco não processa, e a régua que os separa (`missing` vs `malformed`) é do
  // pré-voo, que reporta por título. Aqui a pergunta é binária — entra ou não entra.
  | 'payable-payment-detail-invalid'
  // Ajuste de valor recusado porque algum título da nota está preso numa remessa viva — o banco já
  // recebeu a ordem de pagamento. Mudar o valor aqui faria o arquivo enviado e o título divergirem,
  // e a conciliação do retorno compararia coisas diferentes. Para corrigir a nota, descarta-se a
  // remessa primeiro. O domínio não consulta remessa: recebe os ids presos como dado de entrada.
  | 'document-has-held-payable'
  // M2/RN-M2-11: a reclassificação da taxonomia entrou por um título de RETENÇÃO. O imposto é alvo
  // da cascata, nunca fonte — quem dita sob qual projeto o gasto aparece é o título líquido.
  | 'reclassification-source-not-parent';

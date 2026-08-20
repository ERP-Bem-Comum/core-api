import type { Result } from '../../../../shared/primitives/result.ts';

/**
 * Lookup do que NÓS enviamos, pela chave que escrevemos no arquivo (#690).
 *
 * O `yourNumber` (G064) é a única chave de casamento que é nossa: o banco devolve no retorno
 * exatamente o que gravamos na remessa. `fin_remittance_documents.your_number` tem UNIQUE, então a
 * resposta é no máximo um vínculo por chave — e é essa unicidade que torna o casamento uma decisão,
 * não uma heurística.
 *
 * ⚠️ Busca em LOTE, e não uma chamada por pagamento. Um retorno traz centenas de registros; um
 * `findByYourNumber` chamado em laço seria N+1 contra o banco a cada ciclo do worker. A assinatura
 * em lote também é o que permite ao adapter responder "estas cinco existem, aquelas duzentas não"
 * numa consulta só.
 */
export type RemittanceDocumentRef = Readonly<{
  /** G064, exatamente como foi gravado na remessa. */
  yourNumber: string;
  remittanceId: string;
  /**
   * O TÍTULO que o banco confirmou — a unidade em que o pagamento de fato acontece.
   *
   * ⚠️ É o que impede a baixa errada. Uma nota pode sair em parte (o pai no arquivo, a retenção
   * ainda em aberto); enquanto esta chave resolvia para o documento, confirmar um título baixaria a
   * nota inteira, sem erro visível. A conciliação (`confirmReconciliation`) já fala `payableIds`,
   * então o degrau que existia entre retorno e conciliação fecha aqui.
   */
  payableId: string;
  /** A nota de origem, para dizer ao operador de onde veio — não é a unidade de baixa. */
  documentId: string;
  /** Nome do arquivo de remessa — o que permite dizer ao operador de qual envio aquilo veio. */
  fileName: string;
}>;

export type VanReturnMatchError = 'van-return-match-unavailable';

export type VanReturnMatchReader = Readonly<{
  /**
   * Os vínculos conhecidos entre as chaves pedidas. Chave ausente da resposta significa
   * "não é nossa" — e essa ausência é informação, não erro.
   *
   * ⚠️ A resposta é um CONJUNTO: a ordem dela **não** é contrato, e nenhum adapter promete devolver
   * na ordem em que as chaves foram pedidas. O Drizzle fatia a consulta em blocos e não tem
   * `ORDER BY` — dentro de cada bloco quem ordena é o otimizador do MySQL. Quem precisar de ordem
   * ordena no consumidor. O casamento (`van-return-matching.ts`) indexa por chave e itera os
   * pagamentos LIDOS, então a ordem que chega ao operador é a do arquivo, não a desta resposta;
   * prometer o contrário custaria ao adapter real reordenar linhas atravessando os blocos para
   * servir ninguém.
   */
  findByYourNumbers: (
    yourNumbers: readonly string[],
  ) => Promise<Result<readonly RemittanceDocumentRef[], VanReturnMatchError>>;
}>;

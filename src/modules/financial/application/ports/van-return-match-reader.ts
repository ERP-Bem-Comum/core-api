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
  documentId: string;
  /** Nome do arquivo de remessa — o que permite dizer ao operador de qual envio aquilo veio. */
  fileName: string;
}>;

export type VanReturnMatchError = 'van-return-match-unavailable';

export type VanReturnMatchReader = Readonly<{
  /**
   * Os vínculos conhecidos entre as chaves pedidas. Chave ausente da resposta significa
   * "não é nossa" — e essa ausência é informação, não erro.
   */
  findByYourNumbers: (
    yourNumbers: readonly string[],
  ) => Promise<Result<readonly RemittanceDocumentRef[], VanReturnMatchError>>;
}>;

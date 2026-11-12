/** Os extremos de janela de data que as listagens do financial aceitam na query. */
export const DATE_WINDOW_QUERY_FIELDS = ['dueFrom', 'dueTo', 'issuedFrom', 'issuedTo'] as const;

/**
 * Converte os extremos de janela de data já validados pela query em `Date`, à meia-noite UTC. Só os
 * campos pedidos e presentes viram chave; o resto da query é ignorado.
 *
 * @typeParam K - os nomes dos campos de data
 * @param query - a query validada pelo schema da rota
 * @param fields - os campos de data a converter
 * @returns o pedaço parcial do filtro, sem chave para o extremo ausente
 * @see tests/modules/financial/adapters/http/date-window-query.test.ts
 */
export const dateWindowFromQuery = <K extends string>(
  query: Readonly<Partial<Record<K, string | undefined>>>,
  fields: readonly K[],
): Partial<Record<K, Date>> => {
  const window: Partial<Record<K, Date>> = {};
  for (const field of fields) {
    const raw = query[field];
    if (raw !== undefined) window[field] = new Date(raw);
  }
  return window;
};

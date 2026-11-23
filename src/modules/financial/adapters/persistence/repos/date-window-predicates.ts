import { gte, lte, type SQL, type SQLWrapper } from 'drizzle-orm';

/**
 * Monta os predicados SQL da janela `[from, to]` sobre uma coluna de data: `>=` para o extremo
 * inicial e `<=` para o final, cada um só quando o extremo existe.
 *
 * @param column - a coluna de data filtrada
 * @param from - o extremo inicial, inclusivo
 * @param to - o extremo final, inclusivo
 * @returns zero, um ou dois predicados, para compor com `and`
 * @see tests/modules/financial/adapters/persistence/repos/date-window-predicates.test.ts
 */
export const dateWindowPredicates = (
  column: SQLWrapper,
  from: Date | undefined,
  to: Date | undefined,
): SQL[] => [
  ...(from !== undefined ? [gte(column, from)] : []),
  ...(to !== undefined ? [lte(column, to)] : []),
];

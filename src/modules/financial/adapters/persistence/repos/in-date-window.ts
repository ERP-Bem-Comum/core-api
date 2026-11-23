/**
 * Diz se uma data cabe na janela `[from, to]`, fechada nos dois extremos. Cada extremo vale sozinho;
 * sem nenhum extremo, qualquer valor passa, inclusive `null`. Com qualquer extremo ativo, `null`
 * fica de fora, como no SQL.
 *
 * @param value - a data do registro, ou `null` quando ele não a tem
 * @param from - o extremo inicial, inclusivo
 * @param to - o extremo final, inclusivo
 * @returns `true` quando a data está dentro da janela
 * @see tests/modules/financial/adapters/persistence/repos/in-date-window.test.ts
 */
export const inDateWindow = (
  value: Date | null,
  from: Date | undefined,
  to: Date | undefined,
): boolean => {
  if (from === undefined && to === undefined) return true;
  if (value === null) return false;
  if (from !== undefined && value.getTime() < from.getTime()) return false;
  if (to !== undefined && value.getTime() > to.getTime()) return false;
  return true;
};

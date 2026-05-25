/**
 * Formata `Date` em estilo BR (`DD/MM/YYYY`) usando UTC.
 *
 * Pattern espelha `src/modules/contracts/cli/formatters/date.ts` — **lógica
 * funcionalmente idêntica** (cópia direta).
 *
 * **CANDIDATO A EXTRAÇÃO** quando 3º módulo precisar — mover para
 * `src/shared/cli/formatters/date.ts`. Por enquanto: cópia local (YAGNI).
 */

export const formatDate = (d: Date): string => {
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear().toString();
  return `${day}/${month}/${year}`;
};

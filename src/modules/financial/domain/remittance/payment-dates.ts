// Coerência de data da remessa: UM arquivo, UM dia (decisão da P.O. na #711).
//
// A data nunca foi propriedade da remessa — só de cada pagamento. Enquanto a fatia era "gerar um
// arquivo com os títulos que o operador escolheu", isso bastava. Com a regra de que data diferente
// é outra remessa, a coerência do conjunto passa a precisar de dono, e é este arquivo.
//
// O fluxo do operador já garante a unicidade na origem: a remessa é gerada **por vencimento**, a
// partir do grid do Contas a Pagar. Esta função existe para o caso em que a origem falha — e
// falhar aqui é barato, enquanto descobrir na conciliação, dias depois, não é.

// Dia civil em UTC, no formato que ordena lexicograficamente.
//
// UTC porque é o que o adapter escreve: `dateDDMMYYYY` usa `getUTCDate`/`getUTCMonth`
// (`adapters/cnab/positional.ts:47`). Comparar em horário local faria esta validação discordar da
// emissão perto da meia-noite — recusando uma seleção cujos registros sairiam com a mesma data.
const utcDay = (at: Date): string => {
  const y = String(at.getUTCFullYear()).padStart(4, '0');
  const m = String(at.getUTCMonth() + 1).padStart(2, '0');
  const d = String(at.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Os dias distintos presentes na seleção, ordenados. Devolve a LISTA, não um booleano: quem recusa
// precisa dizer QUAIS datas colidiram, senão o operador recebe uma negativa sem ação possível — o
// mesmo defeito que o slug genérico `remittance-payments-unavailable` já produz hoje.
export const distinctPaymentDays = (dates: readonly Date[]): readonly string[] =>
  [...new Set(dates.map(utcDay))].toSorted();

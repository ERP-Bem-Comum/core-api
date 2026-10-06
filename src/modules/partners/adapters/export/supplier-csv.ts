/**
 * Serialização CSV da listagem de fornecedores. Achata o agregado `Supplier` (discriminado por
 * `status`) em células planas; a mecânica de formato (escape RFC 4180, anti-fórmula, BOM) vem do
 * util compartilhado `#src/shared/utils/csv.ts`. Colunas em ordem fixa.
 *
 * Adapter de apresentação puro: sem port, sem use case, sem IO. Reusável por uma futura rota/CLI.
 */

import { toCsv } from '#src/shared/utils/csv.ts';
import { companyNamesOf, documentOf } from '../../domain/supplier/supplier.ts';
import type { Supplier } from '../../domain/supplier/types.ts';

const HEADER: readonly string[] = [
  'id',
  'name',
  'email',
  // Rótulo ao humano (#1022): a coluna traz CPF (PF) ou CNPJ (PJ).
  'CPF/CNPJ',
  'corporateName',
  'fantasyName',
  'serviceCategory',
  'status',
  'bankAccountBank',
  'bankAccountAgency',
  'bankAccountNumber',
  'bankAccountCheckDigit',
  'pixKeyType',
  'pixKey',
  'deactivatedAt',
];

// Achata o agregado em 15 células (ordem do HEADER). Destino de pagamento é discriminado:
// colunas bancárias vazias quando `bankAccount` é null; idem pix. `deactivatedAt` só nos Inactive.
// Razão social e nome fantasia só existem na PJ; na PF as células ficam vazias.
const supplierToCells = (s: Supplier): readonly string[] => {
  const names = companyNamesOf(s.identity);
  const identity = [
    s.id,
    s.name,
    s.email,
    documentOf(s),
    names?.corporateName ?? '',
    names?.fantasyName ?? '',
    s.serviceCategory,
    s.status,
  ];
  const bank = s.bankAccount;
  const pix = s.pixKey;
  const paymentTarget = [
    bank?.bank ?? '',
    bank?.agency ?? '',
    bank?.accountNumber ?? '',
    bank?.checkDigit ?? '',
    pix?.keyType ?? '',
    pix?.key ?? '',
  ];
  switch (s.status) {
    case 'Active':
      return [...identity, ...paymentTarget, ''];
    case 'Inactive':
      return [...identity, ...paymentTarget, s.deactivatedAt.toISOString()];
  }
};

export const suppliersToCsv = (suppliers: readonly Supplier[]): string =>
  toCsv(HEADER, suppliers.map(supplierToCells));

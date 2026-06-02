// Mapper Financier: row MySQL ↔ agregado Financier (módulo partners).
//
//   - financierToInsert(financier, now): NewFinancierRow — active/deactivated_at
//     derivados do estado; `now` injetado (sem `new Date()`).
//   - financierFromRow(row): Result<Financier, FinancierMapperError> — reidrata id
//     (FinancierId.rehydrate) e cnpj (Cnpj.parse) na borda, delega a Financier.rehydrate.
//
// ADR-0020: sem JSON, dialeto MySQL único. ADR-0014: só par_*. Zero throw na borda.

import { type Result, err } from '#src/shared/primitives/result.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import type { Financier as FinancierEntity } from '#src/modules/partners/domain/financier/types.ts';
import type { FinancierRow, NewFinancierRow } from '../schemas/mysql.ts';

export type FinancierMapperError =
  | 'financier-mapper-invalid-id'
  | 'financier-mapper-invalid-cnpj'
  | 'financier-mapper-invalid-state';

export const financierToInsert = (financier: FinancierEntity, now: Date): NewFinancierRow => ({
  id: financier.id as unknown as string,
  name: financier.name,
  corporateName: financier.corporateName,
  legalRepresentative: financier.legalRepresentative,
  cnpj: financier.cnpj as unknown as string,
  telephone: financier.telephone,
  address: financier.address,
  active: financier.status === 'Active',
  deactivatedAt: financier.status === 'Inactive' ? financier.deactivatedAt : null,
  createdAt: now,
  updatedAt: now,
});

export const financierFromRow = (
  row: Readonly<FinancierRow>,
): Result<FinancierEntity, FinancierMapperError> => {
  const id = FinancierId.rehydrate(row.id);
  if (!id.ok) return err('financier-mapper-invalid-id');

  const cnpj = Cnpj.parse(row.cnpj);
  if (!cnpj.ok) return err('financier-mapper-invalid-cnpj');

  const rehydrated = Financier.rehydrate({
    id: id.value,
    name: row.name,
    corporateName: row.corporateName,
    legalRepresentative: row.legalRepresentative,
    cnpj: cnpj.value,
    telephone: row.telephone,
    address: row.address,
    status: row.active ? 'Active' : 'Inactive',
    deactivatedAt: row.deactivatedAt,
  });
  if (!rehydrated.ok) return err('financier-mapper-invalid-state');

  return rehydrated;
};

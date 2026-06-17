// Mapper Financier: row MySQL ↔ agregado Financier (módulo partners).
//
//   - financierToInsert(financier, now): NewFinancierRow — payment target achatado em
//     colunas (bank_account_*/pix_*); active/deactivated_at derivados; `now` injetado.
//   - financierFromRow(row): Result<Financier, FinancierMapperError> — reidrata id/cnpj e
//     reconstrói os VOs de payment target na borda, delega a Financier.rehydrate.
//
// ADR-0020: sem JSON (payment target achatado em colunas). ADR-0014: só par_*. Zero throw na borda.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as PaymentTarget from '#src/modules/partners/domain/shared/payment-target.ts';
import type { BankAccount, PixKey } from '#src/modules/partners/domain/shared/payment-target.ts';
import type { Financier as FinancierEntity } from '#src/modules/partners/domain/financier/types.ts';
import type { FinancierRow, NewFinancierRow } from '../schemas/mysql.ts';

export type FinancierMapperError =
  | 'financier-mapper-invalid-id'
  | 'financier-mapper-invalid-cnpj'
  | 'financier-mapper-invalid-payment-target'
  | 'financier-mapper-invalid-state';

export const financierToInsert = (financier: FinancierEntity, now: Date): NewFinancierRow => {
  const bank = financier.bankAccount;
  const pix = financier.pixKey;
  return {
    id: financier.id as unknown as string,
    name: financier.name,
    corporateName: financier.corporateName,
    legalRepresentative: financier.legalRepresentative,
    cnpj: financier.cnpj as unknown as string,
    telephone: financier.telephone,
    address: financier.address,
    bankAccountBank: bank?.bank ?? null,
    bankAccountAgency: bank?.agency ?? null,
    bankAccountNumber: bank?.accountNumber ?? null,
    bankAccountCheckDigit: bank?.checkDigit ?? null,
    pixKeyType: pix?.keyType ?? null,
    pixKey: pix?.key ?? null,
    active: financier.status === 'Active',
    deactivatedAt: financier.status === 'Inactive' ? financier.deactivatedAt : null,
    createdAt: now,
    updatedAt: now,
  };
};

// Reconstrói BankAccount da row (4 colunas). Ausência total → ok(null). Erro de VO → err.
const bankFromRow = (
  row: Readonly<FinancierRow>,
): Result<BankAccount | null, 'financier-mapper-invalid-payment-target'> => {
  if (row.bankAccountBank === null) return ok(null);
  const r = PaymentTarget.createBankAccount({
    bank: row.bankAccountBank,
    agency: row.bankAccountAgency ?? '',
    accountNumber: row.bankAccountNumber ?? '',
    checkDigit: row.bankAccountCheckDigit ?? '',
  });
  return r.ok ? { ok: true, value: r.value } : err('financier-mapper-invalid-payment-target');
};

const pixFromRow = (
  row: Readonly<FinancierRow>,
): Result<PixKey | null, 'financier-mapper-invalid-payment-target'> => {
  if (row.pixKey === null) return ok(null);
  const r = PaymentTarget.createPixKey({ keyType: row.pixKeyType ?? '', key: row.pixKey });
  return r.ok ? { ok: true, value: r.value } : err('financier-mapper-invalid-payment-target');
};

export const financierFromRow = (
  row: Readonly<FinancierRow>,
): Result<FinancierEntity, FinancierMapperError> => {
  const id = FinancierId.rehydrate(row.id);
  if (!id.ok) return err('financier-mapper-invalid-id');

  const cnpj = Cnpj.parse(row.cnpj);
  if (!cnpj.ok) return err('financier-mapper-invalid-cnpj');

  const bank = bankFromRow(row);
  if (!bank.ok) return bank;

  const pix = pixFromRow(row);
  if (!pix.ok) return pix;

  const rehydrated = Financier.rehydrate({
    id: id.value,
    name: row.name,
    corporateName: row.corporateName,
    legalRepresentative: row.legalRepresentative,
    cnpj: cnpj.value,
    telephone: row.telephone,
    address: row.address,
    bankAccount: bank.value,
    pixKey: pix.value,
    status: row.active ? 'Active' : 'Inactive',
    deactivatedAt: row.deactivatedAt,
  });
  if (!rehydrated.ok) return err('financier-mapper-invalid-state');

  return rehydrated;
};

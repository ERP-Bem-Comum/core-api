// Mapper Supplier: row MySQL ↔ agregado Supplier (módulo partners).
//
//   - supplierToInsert(supplier, now): NewSupplierRow — payment target achatado em
//     colunas (bank_account_*/pix_*); active/deactivated_at derivados; `now` injetado.
//   - supplierFromRow(row): Result<Supplier, SupplierMapperError> — reidrata id/cnpj/
//     serviceCategory e reconstrói os VOs de payment target na borda, delega a
//     Supplier.rehydrate (reaplica invariantes).
//
// ADR-0020: sem JSON (payment target achatado em colunas). ADR-0014: só par_*. Zero throw na borda.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as ServiceCategory from '#src/modules/partners/domain/supplier/service-category.ts';
import * as ServiceRating from '#src/modules/partners/domain/supplier/service-rating.ts';
import * as PaymentTarget from '#src/modules/partners/domain/supplier/payment-target.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import type { BankAccount, PixKey } from '#src/modules/partners/domain/supplier/payment-target.ts';
import type { Supplier as SupplierEntity } from '#src/modules/partners/domain/supplier/types.ts';
import type { SupplierRow, NewSupplierRow } from '../schemas/mysql.ts';

export type SupplierMapperError =
  | 'supplier-mapper-invalid-id'
  | 'supplier-mapper-invalid-cnpj'
  | 'supplier-mapper-invalid-service-category'
  | 'supplier-mapper-invalid-service-rating'
  | 'supplier-mapper-invalid-payment-target'
  | 'supplier-mapper-invalid-state';

export const supplierToInsert = (supplier: SupplierEntity, now: Date): NewSupplierRow => {
  const bank = supplier.bankAccount;
  const pix = supplier.pixKey;
  return {
    id: supplier.id as unknown as string,
    name: supplier.name,
    email: supplier.email,
    cnpj: supplier.cnpj as unknown as string,
    corporateName: supplier.corporateName,
    fantasyName: supplier.fantasyName,
    serviceCategory: supplier.serviceCategory,
    active: supplier.status === 'Active',
    deactivatedAt: supplier.status === 'Inactive' ? supplier.deactivatedAt : null,
    bankAccountBank: bank?.bank ?? null,
    bankAccountAgency: bank?.agency ?? null,
    bankAccountNumber: bank?.accountNumber ?? null,
    bankAccountCheckDigit: bank?.checkDigit ?? null,
    pixKeyType: pix?.keyType ?? null,
    pixKey: pix?.key ?? null,
    serviceRating: supplier.serviceRating,
    ratingComment: supplier.ratingComment,
    createdAt: now,
    updatedAt: now,
  };
};

// Reconstrói BankAccount da row (4 colunas). Ausência total → ok(null). Erro de VO → err.
const bankFromRow = (
  row: Readonly<SupplierRow>,
): Result<BankAccount | null, 'supplier-mapper-invalid-payment-target'> => {
  if (row.bankAccountBank === null) return ok(null);
  const r = PaymentTarget.createBankAccount({
    bank: row.bankAccountBank,
    agency: row.bankAccountAgency ?? '',
    accountNumber: row.bankAccountNumber ?? '',
    checkDigit: row.bankAccountCheckDigit ?? '',
  });
  return r.ok ? { ok: true, value: r.value } : err('supplier-mapper-invalid-payment-target');
};

const pixFromRow = (
  row: Readonly<SupplierRow>,
): Result<PixKey | null, 'supplier-mapper-invalid-payment-target'> => {
  if (row.pixKey === null) return ok(null);
  const r = PaymentTarget.createPixKey({ keyType: row.pixKeyType ?? '', key: row.pixKey });
  return r.ok ? { ok: true, value: r.value } : err('supplier-mapper-invalid-payment-target');
};

export const supplierFromRow = (
  row: Readonly<SupplierRow>,
): Result<SupplierEntity, SupplierMapperError> => {
  const id = SupplierId.rehydrate(row.id);
  if (!id.ok) return err('supplier-mapper-invalid-id');

  const cnpj = Cnpj.parse(row.cnpj);
  if (!cnpj.ok) return err('supplier-mapper-invalid-cnpj');

  const category = ServiceCategory.parse(row.serviceCategory);
  if (!category.ok) return err('supplier-mapper-invalid-service-category');

  const bank = bankFromRow(row);
  if (!bank.ok) return bank;

  const pix = pixFromRow(row);
  if (!pix.ok) return pix;

  let serviceRating: ServiceRating.ServiceRating | null = null;
  if (row.serviceRating !== null) {
    const r = ServiceRating.parse(row.serviceRating);
    if (!r.ok) return err('supplier-mapper-invalid-service-rating');
    serviceRating = r.value;
  }

  const rehydrated = Supplier.rehydrate({
    id: id.value,
    name: row.name,
    email: row.email,
    cnpj: cnpj.value,
    corporateName: row.corporateName,
    fantasyName: row.fantasyName,
    serviceCategory: category.value,
    bankAccount: bank.value,
    pixKey: pix.value,
    serviceRating,
    ratingComment: row.ratingComment,
    status: row.active ? 'Active' : 'Inactive',
    deactivatedAt: row.deactivatedAt,
  });
  if (!rehydrated.ok) return err('supplier-mapper-invalid-state');

  return rehydrated;
};

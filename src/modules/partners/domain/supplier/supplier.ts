/**
 * Operações do agregado `Supplier` (Fornecedor). Consumir via
 * `import * as Supplier from './supplier.ts'`. IDs/instantes injetados.
 *
 *   - `register` — smart constructor: nasce Active. Invariante "destino de
 *     pagamento" (bankAccount OU pixKey).
 *   - `deactivate`/`reactivate` — ciclo de vida (soft-delete).
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as ServiceCategory from './service-category.ts';
import * as PaymentTarget from './payment-target.ts';
import type { BankAccount, PixKey } from './payment-target.ts';
import type {
  ActiveSupplier,
  InactiveSupplier,
  RegisterSupplierInput,
  RehydrateSupplierInput,
  Supplier,
} from './types.ts';
import type { SupplierEvent } from './events.ts';
import type { SupplierError } from './errors.ts';

// Formato pragmático (não RFC 5322 completo): algo@algo.tld. VO Email no kernel
// (ADR-0031 §D4) substitui esta checagem quando existir.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (s: string): boolean => s.trim().length === 0;

export const register = (
  input: RegisterSupplierInput,
): Result<{ supplier: ActiveSupplier; event: SupplierEvent }, SupplierError> => {
  if (isBlank(input.name)) return err('supplier-name-required');
  if (isBlank(input.email)) return err('supplier-email-required');
  if (!EMAIL_RE.test(input.email.trim())) return err('supplier-email-invalid');
  if (isBlank(input.corporateName)) return err('supplier-corporate-name-required');
  if (isBlank(input.fantasyName)) return err('supplier-fantasy-name-required');

  const cnpj = Cnpj.parse(input.cnpj);
  if (!cnpj.ok) return err('invalid-cnpj');

  const category = ServiceCategory.parse(input.serviceCategory);
  if (!category.ok) return err('invalid-service-category');

  let bankAccount: BankAccount | null = null;
  if (input.bankAccount !== null) {
    const r = PaymentTarget.createBankAccount(input.bankAccount);
    if (!r.ok) return err(r.error);
    bankAccount = r.value;
  }

  let pixKey: PixKey | null = null;
  if (input.pixKey !== null) {
    const r = PaymentTarget.createPixKey(input.pixKey);
    if (!r.ok) return err(r.error);
    pixKey = r.value;
  }

  if (bankAccount === null && pixKey === null) return err('supplier-payment-target-required');

  const supplier: ActiveSupplier = immutable({
    id: input.id,
    name: input.name.trim(),
    email: input.email.trim(),
    cnpj: cnpj.value,
    corporateName: input.corporateName.trim(),
    fantasyName: input.fantasyName.trim(),
    serviceCategory: category.value,
    bankAccount,
    pixKey,
    status: 'Active',
  });

  return ok({
    supplier,
    event: {
      type: 'SupplierRegistered',
      supplierId: supplier.id,
      cnpj: supplier.cnpj,
      occurredAt: input.registeredAt,
    },
  });
};

export const deactivate = (
  supplier: Supplier,
  at: Date,
): Result<{ supplier: InactiveSupplier; event: SupplierEvent }, SupplierError> => {
  if (supplier.status === 'Inactive') return err('supplier-already-inactive');
  const inactive: InactiveSupplier = immutable({
    ...supplier,
    status: 'Inactive',
    deactivatedAt: at,
  });
  return ok({
    supplier: inactive,
    event: { type: 'SupplierDeactivated', supplierId: supplier.id, occurredAt: at },
  });
};

export const reactivate = (
  supplier: Supplier,
  at: Date,
): Result<{ supplier: ActiveSupplier; event: SupplierEvent }, SupplierError> => {
  if (supplier.status === 'Active') return err('supplier-already-active');
  const { deactivatedAt: _deactivatedAt, ...core } = supplier;
  const active: ActiveSupplier = immutable({ ...core, status: 'Active' });
  return ok({
    supplier: active,
    event: { type: 'SupplierReactivated', supplierId: supplier.id, occurredAt: at },
  });
};

// Reconstrói o agregado a partir de dados persistidos (sem emitir evento). Reaplica
// as invariantes: ao menos um destino de pagamento; Inactive exige deactivatedAt.
export const rehydrate = (input: RehydrateSupplierInput): Result<Supplier, SupplierError> => {
  if (input.bankAccount === null && input.pixKey === null) {
    return err('supplier-payment-target-required');
  }

  const core = {
    id: input.id,
    name: input.name,
    email: input.email,
    cnpj: input.cnpj,
    corporateName: input.corporateName,
    fantasyName: input.fantasyName,
    serviceCategory: input.serviceCategory,
    bankAccount: input.bankAccount,
    pixKey: input.pixKey,
  };

  if (input.status === 'Active') {
    return ok(immutable({ ...core, status: 'Active' }));
  }

  if (input.deactivatedAt === null) return err('supplier-inactive-requires-deactivated-at');
  return ok(immutable({ ...core, status: 'Inactive', deactivatedAt: input.deactivatedAt }));
};

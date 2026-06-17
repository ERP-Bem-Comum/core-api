/**
 * Operações do agregado `Financier` (Financiador).
 *
 * Agregado exportado como funções soltas, consumidas via
 * `import * as Financier from './financier.ts'` (pattern de `payable.ts`).
 * Transições constroem novo subtipo refinado via `immutable(...)`. IDs e
 * instantes são injetados pelo caller (sem `new Date()`/geração no domínio).
 *
 * Operações:
 *   - `register` — smart constructor: nasce `Active`.
 *   - `deactivate` — Active → Inactive (soft-delete do módulo partners).
 *   - `reactivate` — Inactive → Active.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as PaymentTarget from '../shared/payment-target.ts';
import type {
  BankAccount,
  BankAccountInput,
  PaymentTargetError,
  PixKey,
  PixKeyInput,
} from '../shared/payment-target.ts';
import type {
  ActiveFinancier,
  EditFinancierInput,
  Financier,
  InactiveFinancier,
  RegisterFinancierInput,
  RehydrateFinancierInput,
} from './types.ts';
import type { FinancierEvent } from './events.ts';
import type { FinancierError } from './errors.ts';

const isBlank = (s: string): boolean => s.trim().length === 0;

// Banco/PIX opcionais (sem invariante "ao menos um"). Parseia os blocos presentes; null permanece null.
const parsePaymentTargets = (
  bankAccount: BankAccountInput | null,
  pixKey: PixKeyInput | null,
): Result<{ bankAccount: BankAccount | null; pixKey: PixKey | null }, PaymentTargetError> => {
  let bank: BankAccount | null = null;
  if (bankAccount !== null) {
    const r = PaymentTarget.createBankAccount(bankAccount);
    if (!r.ok) return r;
    bank = r.value;
  }
  let pix: PixKey | null = null;
  if (pixKey !== null) {
    const r = PaymentTarget.createPixKey(pixKey);
    if (!r.ok) return r;
    pix = r.value;
  }
  return ok({ bankAccount: bank, pixKey: pix });
};

export const register = (
  input: RegisterFinancierInput,
): Result<{ financier: ActiveFinancier; event: FinancierEvent }, FinancierError> => {
  if (isBlank(input.name)) return err('financier-name-required');
  if (isBlank(input.corporateName)) return err('financier-corporate-name-required');
  if (isBlank(input.legalRepresentative)) return err('financier-legal-representative-required');
  if (isBlank(input.telephone)) return err('financier-telephone-required');
  if (isBlank(input.address)) return err('financier-address-required');

  const cnpj = Cnpj.parse(input.cnpj);
  if (!cnpj.ok) return err('invalid-cnpj');

  const targets = parsePaymentTargets(input.bankAccount ?? null, input.pixKey ?? null);
  if (!targets.ok) return targets;

  const financier: ActiveFinancier = immutable({
    id: input.id,
    name: input.name.trim(),
    corporateName: input.corporateName.trim(),
    legalRepresentative: input.legalRepresentative.trim(),
    cnpj: cnpj.value,
    telephone: input.telephone.trim(),
    address: input.address.trim(),
    bankAccount: targets.value.bankAccount,
    pixKey: targets.value.pixKey,
    status: 'Active',
  });

  const event: FinancierEvent = {
    type: 'FinancierRegistered',
    financierId: financier.id,
    cnpj: financier.cnpj,
    occurredAt: input.registeredAt,
  };

  return ok({ financier, event });
};

/**
 * Edição cadastral (PUT total): revalida os 6 campos + CNPJ e reconstrói o agregado,
 * preservando `id` e o estado de soft-delete (Active/Inactive + deactivatedAt). RBAC do
 * campo vital (CNPJ) é decidido fora (use case/borda). Emite `FinancierEdited`.
 */
export const edit = (
  financier: Financier,
  input: EditFinancierInput,
  at: Date,
): Result<{ financier: Financier; event: FinancierEvent }, FinancierError> => {
  if (isBlank(input.name)) return err('financier-name-required');
  if (isBlank(input.corporateName)) return err('financier-corporate-name-required');
  if (isBlank(input.legalRepresentative)) return err('financier-legal-representative-required');
  if (isBlank(input.telephone)) return err('financier-telephone-required');
  if (isBlank(input.address)) return err('financier-address-required');

  const cnpj = Cnpj.parse(input.cnpj);
  if (!cnpj.ok) return err('invalid-cnpj');

  const targets = parsePaymentTargets(input.bankAccount ?? null, input.pixKey ?? null);
  if (!targets.ok) return targets;

  const core = {
    id: financier.id,
    name: input.name.trim(),
    corporateName: input.corporateName.trim(),
    legalRepresentative: input.legalRepresentative.trim(),
    cnpj: cnpj.value,
    telephone: input.telephone.trim(),
    address: input.address.trim(),
    bankAccount: targets.value.bankAccount,
    pixKey: targets.value.pixKey,
  };

  const edited: Financier =
    financier.status === 'Active'
      ? immutable({ ...core, status: 'Active' })
      : immutable({ ...core, status: 'Inactive', deactivatedAt: financier.deactivatedAt });

  return ok({
    financier: edited,
    event: { type: 'FinancierEdited', financierId: financier.id, occurredAt: at },
  });
};

export const deactivate = (
  financier: Financier,
  at: Date,
): Result<{ financier: InactiveFinancier; event: FinancierEvent }, FinancierError> => {
  if (financier.status === 'Inactive') return err('financier-already-inactive');

  const inactive: InactiveFinancier = immutable({
    ...financier,
    status: 'Inactive',
    deactivatedAt: at,
  });

  return ok({
    financier: inactive,
    event: { type: 'FinancierDeactivated', financierId: financier.id, occurredAt: at },
  });
};

export const reactivate = (
  financier: Financier,
  at: Date,
): Result<{ financier: ActiveFinancier; event: FinancierEvent }, FinancierError> => {
  if (financier.status === 'Active') return err('financier-already-active');

  const { deactivatedAt: _deactivatedAt, ...core } = financier;
  const active: ActiveFinancier = immutable({ ...core, status: 'Active' });

  return ok({
    financier: active,
    event: { type: 'FinancierReactivated', financierId: financier.id, occurredAt: at },
  });
};

/**
 * Reidrata o agregado a partir de dados persistidos (sem emitir evento). VOs já
 * reconstruídos pela borda; valida apenas a coerência do estado.
 */
export const rehydrate = (input: RehydrateFinancierInput): Result<Financier, FinancierError> => {
  const core = {
    id: input.id,
    name: input.name,
    corporateName: input.corporateName,
    legalRepresentative: input.legalRepresentative,
    cnpj: input.cnpj,
    telephone: input.telephone,
    address: input.address,
    bankAccount: input.bankAccount,
    pixKey: input.pixKey,
  };

  if (input.status === 'Active') {
    return ok(immutable({ ...core, status: 'Active' }));
  }

  if (input.deactivatedAt === null) return err('financier-inactive-requires-deactivated-at');
  return ok(immutable({ ...core, status: 'Inactive', deactivatedAt: input.deactivatedAt }));
};

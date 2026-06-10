/**
 * Operações do agregado `Act` — **Acordo de Cooperação Técnica** (instituição parceira).
 * Consumir via `import * as Act from './act.ts'`. IDs/instantes injetados.
 *
 *   - `register` — smart constructor: nasce Active. Invariante de **repasse condicional**
 *     (hasFinancialTransfer ⇒ bankAccount OU pixKey). Emite `ActRegistered`.
 *   - `edit` — reedita os campos do acordo; preserva `id` e estado. Emite `ActEdited`.
 *   - `deactivate`/`reactivate` — ciclo de vida (soft-delete). Emitem evento.
 *   - `rehydrate` — reconstrói estado persistido, sem evento.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ActNumber from './act-number.ts';
import * as OccupationArea from '../collaborator/occupation-area.ts';
import * as PaymentTarget from '../supplier/payment-target.ts';
import type { BankAccount, PixKey } from '../supplier/payment-target.ts';
import type { Period as PeriodValue } from '#src/shared/kernel/period.ts';
import type { ActError } from './errors.ts';
import type { ActEvent } from './events.ts';
import type {
  Act,
  ActiveAct,
  EditActInput,
  InactiveAct,
  RegisterActInput,
  RehydrateActInput,
} from './types.ts';

// Formato pragmático (não RFC 5322 completo): algo@algo.tld. Igual ao Supplier.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (s: string): boolean => s.trim().length === 0;

// Campos cadastrais validados, partilhados por register/edit. `id`/estado/eventos ficam fora.
type ActFields = Readonly<{
  actNumber: ActNumber.ActNumber;
  name: string;
  email: string;
  cnpj: Cnpj.Cnpj;
  corporateName: string;
  fantasyName: string;
  occupationArea: OccupationArea.OccupationArea;
  legalRepresentative: string;
  validity: PeriodValue;
  hasFinancialTransfer: boolean;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
}>;

const parseValidity = (start: string, end: string): Result<PeriodValue, ActError> => {
  const startDate = PlainDate.from(start);
  if (!startDate.ok) return startDate;
  const endDate = PlainDate.from(end);
  if (!endDate.ok) return endDate;
  return Period.create(startDate.value, endDate.value);
};

// Valida e monta os campos do acordo + a invariante de repasse condicional.
const buildFields = (input: RegisterActInput | EditActInput): Result<ActFields, ActError> => {
  if (isBlank(input.name)) return err('act-name-required');
  if (isBlank(input.email)) return err('act-email-required');
  if (!EMAIL_RE.test(input.email.trim())) return err('act-email-invalid');
  if (isBlank(input.corporateName)) return err('act-corporate-name-required');
  if (isBlank(input.fantasyName)) return err('act-fantasy-name-required');
  if (isBlank(input.legalRepresentative)) return err('act-legal-representative-required');

  const actNumber = ActNumber.parse(input.actNumber);
  if (!actNumber.ok) return actNumber;

  const cnpj = Cnpj.parse(input.cnpj);
  if (!cnpj.ok) return cnpj;

  const occupationArea = OccupationArea.parse(input.occupationArea);
  if (!occupationArea.ok) return occupationArea;

  const validity = parseValidity(input.startDate, input.endDate);
  if (!validity.ok) return validity;

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

  // Repasse condicional: só exige destino quando há transferência financeira.
  if (input.hasFinancialTransfer && bankAccount === null && pixKey === null) {
    return err('act-payment-target-required');
  }

  return ok(
    immutable({
      actNumber: actNumber.value,
      name: input.name.trim(),
      email: input.email.trim(),
      cnpj: cnpj.value,
      corporateName: input.corporateName.trim(),
      fantasyName: input.fantasyName.trim(),
      occupationArea: occupationArea.value,
      legalRepresentative: input.legalRepresentative.trim(),
      validity: validity.value,
      hasFinancialTransfer: input.hasFinancialTransfer,
      bankAccount,
      pixKey,
    }),
  );
};

export const register = (
  input: RegisterActInput,
): Result<{ act: ActiveAct; event: ActEvent }, ActError> => {
  const fields = buildFields(input);
  if (!fields.ok) return fields;

  const act: ActiveAct = immutable({ id: input.id, ...fields.value, status: 'Active' });

  return ok({
    act,
    event: {
      type: 'ActRegistered',
      actId: act.id,
      cnpj: act.cnpj,
      occurredAt: input.registeredAt,
    },
  });
};

export const edit = (
  act: Act,
  input: EditActInput,
  at: Date,
): Result<{ act: Act; event: ActEvent }, ActError> => {
  const fields = buildFields(input);
  if (!fields.ok) return fields;

  const core = { id: act.id, ...fields.value };
  const edited: Act =
    act.status === 'Active'
      ? immutable({ ...core, status: 'Active' })
      : immutable({ ...core, status: 'Inactive', deactivatedAt: act.deactivatedAt });

  return ok({ act: edited, event: { type: 'ActEdited', actId: act.id, occurredAt: at } });
};

export const deactivate = (
  act: Act,
  at: Date,
): Result<{ act: InactiveAct; event: ActEvent }, ActError> => {
  if (act.status === 'Inactive') return err('act-already-inactive');
  const inactive: InactiveAct = immutable({ ...act, status: 'Inactive', deactivatedAt: at });
  return ok({ act: inactive, event: { type: 'ActDeactivated', actId: act.id, occurredAt: at } });
};

export const reactivate = (
  act: Act,
  at: Date,
): Result<{ act: ActiveAct; event: ActEvent }, ActError> => {
  if (act.status === 'Active') return err('act-already-active');
  const { deactivatedAt: _deactivatedAt, ...core } = act;
  const active: ActiveAct = immutable({ ...core, status: 'Active' });
  return ok({ act: active, event: { type: 'ActReactivated', actId: act.id, occurredAt: at } });
};

// Reconstrói o agregado a partir de dados persistidos (sem emitir evento). Reaplica
// a invariante de repasse; Inactive exige deactivatedAt.
export const rehydrate = (input: RehydrateActInput): Result<Act, ActError> => {
  if (input.hasFinancialTransfer && input.bankAccount === null && input.pixKey === null) {
    return err('act-payment-target-required');
  }

  const { status: _status, deactivatedAt, ...core } = input;

  if (input.status === 'Active') {
    return ok(immutable({ ...core, status: 'Active' }));
  }

  if (deactivatedAt === null) return err('act-already-inactive');
  return ok(immutable({ ...core, status: 'Inactive', deactivatedAt }));
};

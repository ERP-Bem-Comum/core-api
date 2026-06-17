// Mapper Act: row MySQL ↔ agregado Act (Acordo de Cooperação Técnica, módulo partners).
//
//   - actToInsert(a, now): NewActRow — vigência (Period Fixed) decomposta em duas colunas
//     `date` (PlainDate → meia-noite UTC); payment target achatado; `now` injetado.
//   - actFromRow(row): Result<Act, ActMapperError> — reidrata id/actNumber/cnpj/occupationArea,
//     reconstrói Period e os VOs de payment target na borda, delega a Act.rehydrate.
//
// ADR-0020: sem JSON (payment target/validity achatados em colunas). ADR-0014: só par_*.
// Zero throw na borda.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';
import * as ActNumber from '#src/modules/partners/domain/act/act-number.ts';
import * as OccupationArea from '#src/modules/partners/domain/collaborator/occupation-area.ts';
import * as PaymentTarget from '#src/modules/partners/domain/shared/payment-target.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import type { BankAccount, PixKey } from '#src/modules/partners/domain/shared/payment-target.ts';
import type { Act as ActEntity } from '#src/modules/partners/domain/act/types.ts';
import type { ActRow, NewActRow } from '../schemas/mysql.ts';

export type ActMapperError =
  | 'act-mapper-invalid-id'
  | 'act-mapper-invalid-act-number'
  | 'act-mapper-invalid-cnpj'
  | 'act-mapper-invalid-enum'
  | 'act-mapper-invalid-validity'
  | 'act-mapper-invalid-payment-target'
  | 'act-mapper-invalid-state';

// PlainDate → `Date` à meia-noite UTC (coluna `date`). Espelha contracts/period.mapper.
const toUTCDate = (d: PlainDate.PlainDate): Date => new Date(Date.UTC(d.year, d.month - 1, d.day));

export const actToInsert = (a: ActEntity, now: Date): NewActRow => {
  const bank = a.bankAccount;
  const pix = a.pixKey;
  // `validity` é sempre Period Fixed no agregado Act (register/edit constroem Fixed via
  // Period.create); Indefinite é inalcançável. `start` existe em ambos os variants.
  const start = a.validity.start;
  const end = a.validity.kind === 'Fixed' ? a.validity.end : a.validity.start;
  return {
    id: a.id as unknown as string,
    actNumber: a.actNumber as unknown as string,
    name: a.name,
    email: a.email,
    cnpj: a.cnpj as unknown as string,
    corporateName: a.corporateName,
    fantasyName: a.fantasyName,
    occupationArea: a.occupationArea,
    legalRepresentative: a.legalRepresentative,
    validityStart: toUTCDate(start),
    validityEnd: toUTCDate(end),
    hasFinancialTransfer: a.hasFinancialTransfer,
    bankAccountBank: bank?.bank ?? null,
    bankAccountAgency: bank?.agency ?? null,
    bankAccountNumber: bank?.accountNumber ?? null,
    bankAccountCheckDigit: bank?.checkDigit ?? null,
    pixKeyType: pix?.keyType ?? null,
    pixKey: pix?.key ?? null,
    active: a.status === 'Active',
    deactivatedAt: a.status === 'Inactive' ? a.deactivatedAt : null,
    createdAt: now,
    updatedAt: now,
  };
};

// Reconstrói BankAccount da row (4 colunas). Ausência total → ok(null). Erro de VO → err.
const bankFromRow = (
  row: Readonly<ActRow>,
): Result<BankAccount | null, 'act-mapper-invalid-payment-target'> => {
  if (row.bankAccountBank === null) return ok(null);
  const r = PaymentTarget.createBankAccount({
    bank: row.bankAccountBank,
    agency: row.bankAccountAgency ?? '',
    accountNumber: row.bankAccountNumber ?? '',
    checkDigit: row.bankAccountCheckDigit ?? '',
  });
  return r.ok ? { ok: true, value: r.value } : err('act-mapper-invalid-payment-target');
};

const pixFromRow = (
  row: Readonly<ActRow>,
): Result<PixKey | null, 'act-mapper-invalid-payment-target'> => {
  if (row.pixKey === null) return ok(null);
  const r = PaymentTarget.createPixKey({ keyType: row.pixKeyType ?? '', key: row.pixKey });
  return r.ok ? { ok: true, value: r.value } : err('act-mapper-invalid-payment-target');
};

export const actFromRow = (row: Readonly<ActRow>): Result<ActEntity, ActMapperError> => {
  const id = ActId.rehydrate(row.id);
  if (!id.ok) return err('act-mapper-invalid-id');

  const actNumber = ActNumber.parse(row.actNumber);
  if (!actNumber.ok) return err('act-mapper-invalid-act-number');

  const cnpj = Cnpj.parse(row.cnpj);
  if (!cnpj.ok) return err('act-mapper-invalid-cnpj');

  const occupationArea = OccupationArea.parse(row.occupationArea);
  if (!occupationArea.ok) return err('act-mapper-invalid-enum');

  const validity = Period.create(
    PlainDate.fromDate(row.validityStart),
    PlainDate.fromDate(row.validityEnd),
  );
  if (!validity.ok) return err('act-mapper-invalid-validity');

  const bank = bankFromRow(row);
  if (!bank.ok) return bank;

  const pix = pixFromRow(row);
  if (!pix.ok) return pix;

  const rehydrated = Act.rehydrate({
    id: id.value,
    actNumber: actNumber.value,
    name: row.name,
    email: row.email,
    cnpj: cnpj.value,
    corporateName: row.corporateName,
    fantasyName: row.fantasyName,
    occupationArea: occupationArea.value,
    legalRepresentative: row.legalRepresentative,
    validity: validity.value,
    hasFinancialTransfer: row.hasFinancialTransfer,
    bankAccount: bank.value,
    pixKey: pix.value,
    status: row.active ? 'Active' : 'Inactive',
    deactivatedAt: row.deactivatedAt,
  });
  if (!rehydrated.ok) return err('act-mapper-invalid-state');
  return rehydrated;
};

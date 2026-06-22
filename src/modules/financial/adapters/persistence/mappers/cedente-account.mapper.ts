import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  ACCOUNT_TYPES,
  type AccountType,
  type CedenteAccount,
  type CedenteAccountStatus,
} from '#src/modules/financial/domain/cedente/types.ts';
import type {
  CedenteAccountRow,
  NewCedenteAccountRow,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

// Mapper row ↔ domínio (`.claude/rules/adapters.md`): `toDomain` retorna `Result` — o domínio rejeita
// estado inválido vindo do banco (status fora do enum, id não-UUID, type fora do union).
export type CedenteAccountMapperError =
  | 'invalid-cedente-account-id'
  | 'invalid-cedente-account-status'
  | 'invalid-cedente-account-type';

const toStatus = (raw: string): CedenteAccountStatus | null =>
  raw === 'Active' || raw === 'Closed' ? raw : null;

export const toRow = (account: CedenteAccount): NewCedenteAccountRow => ({
  id: account.id,
  bankCode: account.bankCode,
  agency: account.agency,
  accountNumber: account.accountNumber,
  accountDigit: account.accountDigit,
  convenio: account.convenio,
  document: account.document,
  status: account.status,
  nextNsa: account.nextNsa,
  type: account.type ?? null,
  typeLabel: account.typeLabel ?? null,
  nickname: account.nickname ?? null,
  bankName: account.bankName ?? null,
  openingBalanceCents: account.openingBalanceCents ?? null,
  openingBalanceDate: account.openingBalanceDate ?? null,
});

export const toDomain = (
  row: Readonly<CedenteAccountRow>,
): Result<CedenteAccount, CedenteAccountMapperError> => {
  const id = CedenteAccountId.rehydrate(row.id);
  if (!id.ok) return err('invalid-cedente-account-id');

  const status = toStatus(row.status);
  if (status === null) return err('invalid-cedente-account-status');

  if (row.type !== null && !ACCOUNT_TYPES.includes(row.type as AccountType)) {
    return err('invalid-cedente-account-type');
  }

  return ok(
    immutable<CedenteAccount>({
      id: id.value,
      bankCode: row.bankCode,
      agency: row.agency,
      accountNumber: row.accountNumber,
      accountDigit: row.accountDigit,
      convenio: row.convenio,
      document: row.document,
      status,
      nextNsa: row.nextNsa,
      ...(row.type !== null ? { type: row.type as AccountType } : {}),
      ...(row.typeLabel !== null ? { typeLabel: row.typeLabel } : {}),
      ...(row.nickname !== null ? { nickname: row.nickname } : {}),
      ...(row.bankName !== null ? { bankName: row.bankName } : {}),
      ...(row.openingBalanceCents !== null ? { openingBalanceCents: row.openingBalanceCents } : {}),
      ...(row.openingBalanceDate !== null ? { openingBalanceDate: row.openingBalanceDate } : {}),
    }),
  );
};

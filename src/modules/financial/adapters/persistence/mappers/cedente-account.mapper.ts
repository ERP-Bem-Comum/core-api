import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccount,
  CedenteAccountStatus,
} from '#src/modules/financial/domain/cedente/types.ts';
import type {
  CedenteAccountRow,
  NewCedenteAccountRow,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

// Mapper row ↔ domínio (`.claude/rules/adapters.md`): `toDomain` retorna `Result` — o domínio rejeita
// estado inválido vindo do banco (status fora do enum, id não-UUID).
export type CedenteAccountMapperError =
  | 'invalid-cedente-account-id'
  | 'invalid-cedente-account-status';

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
});

export const toDomain = (
  row: Readonly<CedenteAccountRow>,
): Result<CedenteAccount, CedenteAccountMapperError> => {
  const id = CedenteAccountId.rehydrate(row.id);
  if (!id.ok) return err('invalid-cedente-account-id');

  const status = toStatus(row.status);
  if (status === null) return err('invalid-cedente-account-status');

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
    }),
  );
};

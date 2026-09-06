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
  raw === 'Active' || raw === 'Closed' || raw === 'Deleted' ? raw : null;

// O discriminador do soft delete na UNIQUE de chave natural (#995, B4). Ver `schemas/mysql.ts` para
// o mecanismo — aqui só a derivação, que existe EM UM LUGAR SÓ de propósito.
//
// ⚠️ Toda escrita da conta passa por `toRow`, então derivar aqui é o que garante que status e slot
// nunca divirjam. Uma linha `Deleted` com slot `'LIVE'` continuaria ocupando a chave para sempre —
// e o CHECK `fin_cedente_accounts_status_deleted_chk` é a rede que recusa exatamente isso, caso
// alguém escreva por outro caminho.
const LIVE_SLOT = 'LIVE';
const naturalKeySlotOf = (account: CedenteAccount): string =>
  account.status === 'Deleted' ? String(account.id) : LIVE_SLOT;

export const toRow = (account: CedenteAccount): NewCedenteAccountRow => ({
  id: account.id,
  bankCode: account.bankCode,
  agency: account.agency,
  agencyDigit: account.agencyDigit ?? null,
  accountNumber: account.accountNumber,
  accountDigit: account.accountDigit,
  convenio: account.convenio,
  document: account.document,
  status: account.status,
  naturalKeySlot: naturalKeySlotOf(account),
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
      // `''` gravado por uma versão anterior colapsa em ausente aqui também — a re-hidratação não
      // passa pelo construtor, e sem esta linha uma linha antiga com string vazia voltaria como
      // "dígito definido", trancando o preenchimento pela edição.
      //
      // ⚠️ O VALOR GRAVADO É O APARADO, e não o bruto da coluna. Guardar `' 5'` produzia DOIS
      // defeitos de uma linha só: `text(' 5', 1)` devolve `' '`, então a 058 sai em BRANCO com o
      // dígito presente no banco; e `wantsAgencyDigitSwap` compara contra o `'5'` que o construtor e
      // a edição gravam, lendo um reenvio idêntico como TROCA e disparando a trava FR-008. As três
      // cópias da mesma regra — construtor, edição e aqui — têm de aparar igual.
      ...(row.agencyDigit !== null && row.agencyDigit.trim() !== ''
        ? { agencyDigit: row.agencyDigit.trim() }
        : {}),
      ...(row.type !== null ? { type: row.type as AccountType } : {}),
      ...(row.typeLabel !== null ? { typeLabel: row.typeLabel } : {}),
      ...(row.nickname !== null ? { nickname: row.nickname } : {}),
      ...(row.bankName !== null ? { bankName: row.bankName } : {}),
      ...(row.openingBalanceCents !== null ? { openingBalanceCents: row.openingBalanceCents } : {}),
      ...(row.openingBalanceDate !== null ? { openingBalanceDate: row.openingBalanceDate } : {}),
    }),
  );
};

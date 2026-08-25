import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import {
  ACCOUNT_TYPES,
  type CedenteAccount,
  type CedenteAccountError,
  type CreateInput,
} from './types.ts';
import * as Nsa from './nsa.ts';

const isBlank = (value: string): boolean => value.trim().length === 0;

export const create = (input: CreateInput): Result<CedenteAccount, CedenteAccountError> => {
  if (isBlank(input.bankCode)) return err('bank-code-required');
  if (isBlank(input.agency)) return err('agency-required');
  if (isBlank(input.accountNumber)) return err('account-number-required');
  if (isBlank(input.document)) return err('document-required');

  // A faixa válida vive no VO `Nsa` (seis dígitos, teto do campo no CNAB 240) — validar aqui com
  // regra própria seria a segunda definição do mesmo limite, e as duas divergiriam.
  const nextNsa = input.nextNsa ?? Nsa.MIN;
  if (!Nsa.rehydrate(nextNsa).ok) return err('invalid-nsa');

  if (input.type !== undefined && !ACCOUNT_TYPES.includes(input.type)) {
    return err('invalid-account-type');
  }

  // Par coeso (FR-006): saldo de abertura e sua data vêm juntos ou nenhum.
  if ((input.openingBalanceCents === undefined) !== (input.openingBalanceDate === undefined)) {
    return err('opening-balance-requires-date');
  }

  return ok(
    immutable<CedenteAccount>({
      id: input.id,
      bankCode: input.bankCode,
      agency: input.agency,
      accountNumber: input.accountNumber,
      accountDigit: input.accountDigit,
      convenio: input.convenio,
      document: input.document,
      status: input.status ?? 'Active',
      nextNsa,
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.typeLabel !== undefined ? { typeLabel: input.typeLabel } : {}),
      ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
      ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
      ...(input.openingBalanceCents !== undefined
        ? { openingBalanceCents: input.openingBalanceCents }
        : {}),
      ...(input.openingBalanceDate !== undefined
        ? { openingBalanceDate: input.openingBalanceDate }
        : {}),
    }),
  );
};

export const isActive = (account: CedenteAccount): boolean => account.status === 'Active';

export const isClosed = (account: CedenteAccount): boolean => account.status === 'Closed';

export const close = (
  account: CedenteAccount,
): Result<CedenteAccount, 'cedente-account-already-closed'> =>
  account.status === 'Active'
    ? ok(immutable<CedenteAccount>({ ...account, status: 'Closed' }))
    : err('cedente-account-already-closed');

export type AllocateNsaError = 'cedente-account-not-active' | 'nsa-exhausted';

export type NsaAllocation = Readonly<{ nsa: Nsa.Nsa; account: CedenteAccount }>;

// Consome o NSA corrente e devolve a conta já apontando para o próximo. Não persiste nada: a
// ATOMICIDADE entre ler e gravar é responsabilidade do adapter (lock de linha), e não pode ser
// simulada aqui — duas remessas concorrentes que leiam o mesmo número geram arquivos com NSA
// repetido, e o banco trata repetição como retransmissão.
//
// A conta pode terminar apontando para fora da faixa: é deliberado. O último número da faixa é
// entregue normalmente, e só a alocação SEGUINTE falha — em vez de recusar uma remessa legítima
// por antecipação.
export const allocateNsa = (account: CedenteAccount): Result<NsaAllocation, AllocateNsaError> => {
  if (!isActive(account)) return err('cedente-account-not-active');

  const current = Nsa.rehydrate(account.nextNsa);
  if (!current.ok) return err('nsa-exhausted');

  return ok({
    nsa: current.value,
    account: immutable<CedenteAccount>({ ...account, nextNsa: account.nextNsa + 1 }),
  });
};

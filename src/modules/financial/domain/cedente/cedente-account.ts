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
      // ⚠️ `''` COLAPSA EM AUSENTE, e não é normalização cosmética: o front envia o campo vazio
      // quando o operador não digitou DV, e guardar `''` faria a conta parecer "com DV já definido"
      // para a régua de preenchimento-uma-vez da edição — trancando o cadastro que a #856 existe
      // para destravar. Sem DV é sem DV, venha como ausência ou como string vazia.
      ...(input.agencyDigit !== undefined && input.agencyDigit.trim() !== ''
        ? { agencyDigit: input.agencyDigit.trim() }
        : {}),
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

// #995 B3 — soft delete. A linha some do grid, não do banco.
export const isDeleted = (account: CedenteAccount): boolean => account.status === 'Deleted';

export const close = (
  account: CedenteAccount,
): Result<CedenteAccount, 'cedente-account-already-closed'> =>
  account.status === 'Active'
    ? ok(immutable<CedenteAccount>({ ...account, status: 'Closed' }))
    : err('cedente-account-already-closed');

/**
 * `Closed` → `Active` (#995, B1).
 *
 * ⚠️ PRESERVA TUDO, e o que mais importa é o que ela NÃO toca: `nextNsa`. Reabrir reiniciando o
 * contador seria a #943 entrando pela porta dos fundos — NSA reemitido é retransmissão aos olhos do
 * banco. Como a reabertura é um `{...account, status}`, o contador vem junto por construção; e desde
 * a #943 ele nem mora mais aqui, mora em `fin_convenio_nsa`. As duas coisas se reforçam.
 *
 * Só a partir de `Closed`. Conta ativa não tem o que reabrir; conta EXCLUÍDA não volta — é a
 * assimetria que dá sentido a existirem duas ações (a P.O., 06/09): encerrar é reversível de
 * propósito, excluir não é.
 */
export const reopen = (
  account: CedenteAccount,
): Result<CedenteAccount, 'cedente-account-not-closed'> =>
  account.status === 'Closed'
    ? ok(immutable<CedenteAccount>({ ...account, status: 'Active' }))
    : err('cedente-account-not-closed');

/**
 * `Closed` → `Deleted` (#995, B3). SOFT delete: a linha permanece.
 *
 * Só a partir de `Closed`, e o erro tem nome PRÓPRIO em vez de reusar o `not-closed` da reabertura:
 * a ação do operador é diferente — ali ele queria reabrir e a conta já estava ativa; aqui ele quer
 * excluir e precisa encerrar antes. Uma mensagem só serviria mal às duas.
 */
export const softDelete = (
  account: CedenteAccount,
): Result<
  CedenteAccount,
  'cedente-account-not-closed-for-delete' | 'cedente-account-already-deleted'
> => {
  if (account.status === 'Deleted') return err('cedente-account-already-deleted');
  if (account.status !== 'Closed') return err('cedente-account-not-closed-for-delete');

  return ok(immutable<CedenteAccount>({ ...account, status: 'Deleted' }));
};

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

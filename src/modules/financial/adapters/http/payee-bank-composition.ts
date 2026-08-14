/**
 * Composição de leitura do bloco bancário do FAVORECIDO na borda HTTP (ADR-0032).
 *
 * Cobre os QUATRO `payeeKind` (#708/CA5, decisão (b) da P.O.). Até 08/2026 só `supplier`
 * era lido e os outros três degradavam para `null` em silêncio — não por decisão, mas
 * porque a premissa "bancário/PIX existem só em Supplier" ficou no código depois que o
 * domínio mudou: `payment-target.ts` declara os VOs compartilhados pelos 4 desde a US1 da
 * feature 015. Um colaborador com conta cadastrada aparecia sem dados bancários na tela, e
 * ninguém tinha como saber se faltava cadastro ou faltava leitura.
 *
 * Not-found, port nulo, IO ou timeout → `null` (degradação graciosa). A indisponibilidade
 * de Parceiros NÃO derruba a leitura do documento — isso continua valendo.
 *
 * @transient — composição síncrona provisória até BFF v2 assumir (ADR-0032).
 */

import type {
  BankAccount,
  ContractorReadError,
  ContractorReadPort,
  PixKey,
} from '#src/modules/partners/public-api/index.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type { PayeeKind } from '../../domain/document/types.ts';

const DEFAULT_TIMEOUT_MS = 2_000;

export type PayeeBankBlock = Readonly<{
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
}>;

const withTimeout = async <T>(p: Promise<T>, ms: number, onTimeout: T): Promise<T> => {
  let fire: (value: T) => void = () => undefined;
  const timeout = new Promise<T>((resolve) => {
    fire = resolve;
  });
  const timer = setTimeout(() => {
    fire(onTimeout);
  }, ms);
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

// Toda View de contratado carrega o bloco; o que muda por `kind` é só QUAL leitura chamar. O
// switch é exaustivo de propósito: um `payeeKind` novo passa a falhar no compilador em vez de
// cair num `default` que devolveria `null` e reintroduziria a degradação silenciosa.
type BankBearingView = Readonly<{ bankAccount: BankAccount | null; pixKey: PixKey | null }>;

const readByKind = (
  port: ContractorReadPort,
  kind: PayeeKind,
  id: string,
): Promise<Result<BankBearingView | null, ContractorReadError>> => {
  switch (kind) {
    case 'supplier':
      return port.getSupplierView(id);
    case 'financier':
      return port.getFinancierView(id);
    case 'collaborator':
      return port.getCollaboratorView(id);
    case 'act':
      return port.getActView(id);
  }
};

export const composePayeeBank = async (
  port: ContractorReadPort | null,
  ref: { kind: PayeeKind | null; id: string | null },
  opts: { timeoutMs?: number } = {},
): Promise<PayeeBankBlock | null> => {
  if (port === null || ref.id === null || ref.kind === null) return null;

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutSentinel = {
    ok: false as const,
    error: 'contractor-read-unavailable' as const,
  };
  const result = await withTimeout(readByKind(port, ref.kind, ref.id), timeoutMs, timeoutSentinel);

  if (!result.ok || result.value === null) return null;
  return { bankAccount: result.value.bankAccount, pixKey: result.value.pixKey };
};

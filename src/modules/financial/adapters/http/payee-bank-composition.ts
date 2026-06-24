/**
 * Composição de leitura do bloco bancário do FAVORECIDO na borda HTTP (ADR-0032).
 *
 * Bancário/PIX existem SOMENTE em `Supplier` (partners/domain). Para qualquer outro
 * `payeeKind`, not-found, port nulo, IO ou timeout → devolve `null` (degradação graciosa).
 * A indisponibilidade de Parceiros NÃO derruba a leitura do documento.
 *
 * @transient — composição síncrona provisória até BFF v2 assumir (ADR-0032).
 */

import type {
  BankAccount,
  ContractorReadPort,
  PixKey,
} from '#src/modules/partners/public-api/index.ts';
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

export const composePayeeBank = async (
  port: ContractorReadPort | null,
  ref: { kind: PayeeKind | null; id: string | null },
  opts: { timeoutMs?: number } = {},
): Promise<PayeeBankBlock | null> => {
  if (port === null || ref.id === null || ref.kind !== 'supplier') return null;

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutSentinel = {
    ok: false as const,
    error: 'contractor-read-unavailable' as const,
  };
  const result = await withTimeout(port.getSupplierView(ref.id), timeoutMs, timeoutSentinel);

  if (!result.ok || result.value === null) return null;
  return { bankAccount: result.value.bankAccount, pixKey: result.value.pixKey };
};

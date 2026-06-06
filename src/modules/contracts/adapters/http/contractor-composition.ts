/**
 * Composição de leitura do CONTRATADO na borda HTTP (rota gorda transitória — ADR-0032).
 *
 * Lê o contratado pela `public-api` de Parceiros (`ContractorReadPort`, ADR-0006/0014)
 * a partir da referência leve `ContractorRef` do agregado, e projeta o `snapshot` plano
 * que o detalhe do contrato expõe. NUNCA toca `par_*` direto.
 *
 * Degradação graciosa (FR-006, anti-oráculo): not-found, erro de IO e timeout colapsam
 * no MESMO `snapshot: null` — sem distinguir o motivo (evita oráculo de enumeração de
 * ids de parceiros). A indisponibilidade de Parceiros não derruba a leitura do contrato.
 */

import type { ContractorType } from '../../domain/shared/contractor.ts';
import type { ContractorReadPort, ContractorView } from '#src/modules/partners/public-api/index.ts';
import type { BankAccount, PixKey } from '#src/modules/partners/domain/supplier/payment-target.ts';

const DEFAULT_TIMEOUT_MS = 2_000;

// Referência leve aceita pela composição. `ContractorId` (branded) é assignable a
// `string`, então o `contractor` do agregado entra sem cast; testes passam `id` plano.
type ContractorRefLike = Readonly<{ type: ContractorType; id: string }>;

export type ContractorSnapshot = Readonly<{
  name: string;
  document: string;
  updatedAt: string;
  // Bancário/PIX existem só para Supplier (o domínio de Parceiros só modela destino
  // de pagamento em supplier). Ausentes para os demais tipos.
  bankAccount?: BankAccount | null;
  pixKey?: PixKey | null;
}>;

export type ContractorBlock = Readonly<{
  type: ContractorType;
  id: string;
  snapshot: ContractorSnapshot | null;
}>;

export type ComposeOptions = Readonly<{ timeoutMs?: number }>;

const viewToSnapshot = (view: ContractorView): ContractorSnapshot =>
  view.type === 'supplier'
    ? {
        name: view.name,
        document: view.document,
        updatedAt: view.updatedAt.toISOString(),
        bankAccount: view.bankAccount,
        pixKey: view.pixKey,
      }
    : { name: view.name, document: view.document, updatedAt: view.updatedAt.toISOString() };

const readByType = (
  port: ContractorReadPort,
  ref: ContractorRefLike,
): Promise<{ ok: true; value: ContractorView | null } | { ok: false; error: unknown }> => {
  switch (ref.type) {
    case 'supplier':
      return port.getSupplierView(ref.id);
    case 'financier':
      return port.getFinancierView(ref.id);
    case 'collaborator':
      return port.getCollaboratorView(ref.id);
    case 'act':
      return port.getActView(ref.id);
  }
};

// Sentinela de timeout — resolve com `onTimeout` (colapsa no mesmo resultado da degradação).
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

/**
 * Compõe o bloco `contractor` do detalhe. Sempre devolve `{ type, id }`; `snapshot` é
 * `null` em qualquer falha (degradação graciosa, FR-006). `port` ausente (ex.: driver
 * memory sem Parceiros) também produz `snapshot: null`.
 */
export const composeContractor = async (
  port: ContractorReadPort | null,
  ref: ContractorRefLike,
  opts: ComposeOptions = {},
): Promise<ContractorBlock> => {
  const { id } = ref;
  if (port === null) return { type: ref.type, id, snapshot: null };

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const result = await withTimeout(readByType(port, ref), timeoutMs, {
    ok: false as const,
    error: 'timeout',
  });

  if (!result.ok || result.value === null) return { type: ref.type, id, snapshot: null };
  return { type: ref.type, id, snapshot: viewToSnapshot(result.value) };
};

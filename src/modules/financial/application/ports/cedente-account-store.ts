import type { Result } from '../../../../shared/primitives/result.ts';
import type { CedenteAccount } from '../../domain/cedente/types.ts';
import type { CedenteAccountId } from '../../domain/cedente/cedente-account-id.ts';
import type { AllocateNsaError } from '../../domain/cedente/cedente-account.ts';
import type { Nsa } from '../../domain/cedente/nsa.ts';

export type CedenteAccountStoreError = 'cedente-account-store-unavailable';

// Chave natural da conta-cedente (FR-016): banco + agência + conta + dígito.
export type CedenteAccountNaturalKey = Readonly<{
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountDigit: string;
}>;

// Erros da alocação de NSA: os do store, mais os do agregado, mais a ausência da conta. A união é
// explícita para o chamador poder distinguir "banco fora do ar" de "conta encerrada" — que exigem
// reações opostas (retentar vs. avisar o operador).
export type NsaAllocationError =
  | CedenteAccountStoreError
  | 'cedente-account-not-found'
  | AllocateNsaError;

export type CedenteAccountStore = Readonly<{
  findById: (
    id: CedenteAccountId,
  ) => Promise<Result<CedenteAccount | null, CedenteAccountStoreError>>;
  findByNaturalKey: (
    key: CedenteAccountNaturalKey,
  ) => Promise<Result<CedenteAccount | null, CedenteAccountStoreError>>;
  list: () => Promise<Result<readonly CedenteAccount[], CedenteAccountStoreError>>;
  // Persiste a conta — EXCETO `nextNsa` numa linha que já existe, que este método NUNCA escreve. O
  // contador tem um escritor só, `allocateNsa`: quem chama `save` monta o objeto a partir de um
  // snapshot lido antes, e gravar o contador dali apagaria uma alocação concorrente. Um `nextNsa`
  // diferente do persistido não é erro nem efeito — é ignorado, em QUALQUER direção (a garantia é
  // "não escreve", não "não retrocede"; aceitar avanço reabriria a mesma porta por um snapshot velho
  // com valor maior). Só na criação, quando nenhum índice único colide, o contador nasce do snapshot.
  // Cobrado dos dois adapters em `tests/…/persistence/cedente-account-store.contract.ts`.
  save: (account: CedenteAccount) => Promise<Result<void, CedenteAccountStoreError>>;
  // Consome o próximo NSA da conta e persiste o avanço ATOMICAMENTE. Ler o número numa chamada e
  // gravar o incremento noutra abre janela para duas remessas concorrentes receberem o MESMO NSA —
  // e o banco trata NSA repetido como retransmissão, não como remessa nova. Por isso a operação é
  // do port, e não composição de `findById` + `save` no use case.
  allocateNsa: (id: CedenteAccountId) => Promise<Result<Nsa, NsaAllocationError>>;
}>;

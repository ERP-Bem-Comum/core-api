import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { reopen } from '../../domain/cedente/cedente-account.ts';
import type { CedenteAccount } from '../../domain/cedente/types.ts';
import type { CedenteAccountIdError } from '../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';

// Desfaz o encerramento (#995, B1). Irmão de `close-cedente-account.ts`, e deliberadamente do mesmo
// tamanho: a assimetria entre encerrar e reabrir não está no código, está na SEMÂNTICA — encerrar é
// reversível, excluir não é.
//
// ⚠️ Não existir esta rota foi o que transformou um encerramento por engano num beco em produção
// (06/09): a conta ficou inacessível pelos dois caminhos — não reabria, e o recadastro batia em
// `cedente-account-duplicate` porque a linha encerrada continua ocupando a chave natural.

export type ReopenCedenteAccountInput = Readonly<{ id: string }>;

export type ReopenCedenteAccountError =
  | 'cedente-account-not-found'
  | 'cedente-account-not-closed'
  | CedenteAccountIdError
  | CedenteAccountStoreError;

type Deps = Readonly<{ cedenteStore: CedenteAccountStore }>;

export const reopenCedenteAccount =
  (deps: Deps) =>
  async (
    input: ReopenCedenteAccountInput,
  ): Promise<Result<CedenteAccount, ReopenCedenteAccountError>> => {
    const id = CedenteAccountId.rehydrate(input.id);
    if (!id.ok) return id;

    const found = await deps.cedenteStore.findById(id.value);
    if (!found.ok) return found;
    if (found.value === null) return err('cedente-account-not-found');

    // A transição — e o que ela preserva — é decisão do DOMÍNIO, não daqui: `reopen` devolve
    // `{...account, status: 'Active'}`, então id, convênio, histórico e `nextNsa` vêm junto por
    // construção. Montar o objeto neste use case abriria a porta para "reabrir zerando o contador",
    // que é a #943 de volta.
    const reopened = reopen(found.value);
    if (!reopened.ok) return reopened;

    const saved = await deps.cedenteStore.save(reopened.value);
    if (!saved.ok) return saved;
    return ok(reopened.value);
  };

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { softDelete } from '../../domain/cedente/cedente-account.ts';
import type { CedenteAccount } from '../../domain/cedente/types.ts';
import type { CedenteAccountIdError } from '../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';

// Exclui a conta-cedente (#995, B3) — SOFT DELETE, obrigatoriamente.
//
// ⚠️ "MANTÉM O HISTÓRICO" NÃO É PREFERÊNCIA, É ESTRUTURA. Remessa, conciliação, extrato e transação
// apontam para esta conta, e as FKs deste módulo são `RESTRICT` de propósito (`.claude/rules/
// adapters.md`): apagar de verdade destruiria o rastro do que foi enviado ao banco, que é justamente
// o que essas tabelas existem para guardar. Um `DELETE` físico nem passaria — estouraria
// `ER_ROW_IS_REFERENCED_2` na primeira conta que já pagou algo.
//
// O que a exclusão faz, então, é mudar o que a conta SIGNIFICA:
//   · sai do grid (inclusive do filtro "Encerradas");
//   · libera a chave natural — recadastrar com os mesmos dados passa a ser aceito (B4);
//   · continua alcançável por id, para o histórico ser lido (B5).
//
// Só a partir de `Closed`, e isso é desenho: excluir é irreversível, então exige o passo deliberado
// de encerrar antes. É a mesma disciplina de dupla confirmação que o encerramento já tinha.

export type DeleteCedenteAccountInput = Readonly<{ id: string }>;

export type DeleteCedenteAccountError =
  | 'cedente-account-not-found'
  | 'cedente-account-not-closed-for-delete'
  | 'cedente-account-already-deleted'
  | CedenteAccountIdError
  | CedenteAccountStoreError;

type Deps = Readonly<{ cedenteStore: CedenteAccountStore }>;

export const deleteCedenteAccount =
  (deps: Deps) =>
  async (
    input: DeleteCedenteAccountInput,
  ): Promise<Result<CedenteAccount, DeleteCedenteAccountError>> => {
    const id = CedenteAccountId.rehydrate(input.id);
    if (!id.ok) return id;

    const found = await deps.cedenteStore.findById(id.value);
    if (!found.ok) return found;
    if (found.value === null) return err('cedente-account-not-found');

    const deleted = softDelete(found.value);
    if (!deleted.ok) return deleted;

    // O `save` grava o status novo E o discriminador da chave natural, derivado no mapper — é ele
    // que efetivamente libera a chave. Ver `schemas/mysql.ts` §`natural_key_slot`.
    const saved = await deps.cedenteStore.save(deleted.value);
    if (!saved.ok) return saved;
    return ok(deleted.value);
  };

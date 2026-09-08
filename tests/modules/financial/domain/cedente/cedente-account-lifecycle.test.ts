import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create,
  close,
  reopen,
  softDelete,
  isActive,
  isClosed,
  isDeleted,
} from '#src/modules/financial/domain/cedente/cedente-account.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';

/**
 * A MÁQUINA DE ESTADOS da conta-cedente (#995, B1/B3).
 *
 * `Active` ⇄ `Closed` → `Deleted`. A assimetria é o desenho, não descuido (P.O., 06/09):
 *
 *   · **encerrar é reversível** — o operador erra, ou quer tirar do fluxo e manter a linha no grid;
 *   · **excluir não é** — e por isso exige o passo deliberado de encerrar antes.
 *
 * Não existir a volta foi o que transformou um encerramento por engano num beco em produção: a conta
 * não reabria, e o recadastro batia em `cedente-account-duplicate` porque a linha encerrada continua
 * ocupando a chave natural.
 */
const account = (): CedenteAccount => {
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '123456',
    document: '12345678000190',
    nextNsa: 42,
  });
  if (!r.ok) throw new Error('setup: cedente');
  return r.value;
};

const closedAccount = (): CedenteAccount => {
  const r = close(account());
  if (!r.ok) throw new Error('setup: close');
  return r.value;
};

describe('cedente-account — reabrir (#995 B1)', () => {
  it('Closed → Active', () => {
    const r = reopen(closedAccount());

    assert.ok(isOk(r));
    assert.equal(r.value.status, 'Active');
    assert.ok(isActive(r.value));
  });

  /*
   * ⚠️ O CASO QUE NÃO PODE FALHAR — CA5 da issue.
   *
   * Reabrir reiniciando o contador seria a #943 entrando pela porta dos fundos: NSA reemitido é
   * RETRANSMISSÃO aos olhos do banco. Desde a #943 o contador nem mora mais aqui (está em
   * `fin_convenio_nsa`), e a reabertura é um spread — as duas coisas se reforçam, e este caso vigia
   * que nenhuma das duas mude sem a outra.
   */
  it('B1/CA5: preserva id, convênio e nextNsa — reabrir NÃO reinicia contador', () => {
    const before = closedAccount();
    const r = reopen(before);

    assert.ok(isOk(r));
    assert.equal(r.value.id, before.id, 'a identidade mudou — a conta virou outra');
    assert.equal(r.value.convenio, before.convenio);
    assert.equal(r.value.nextNsa, 42, 'o contador foi reiniciado pela reabertura');
  });

  it('B2: reabrir conta ATIVA é recusado com nome próprio', () => {
    const r = reopen(account());

    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-account-not-closed');
  });

  // Excluída não volta — é o que distingue as duas ações.
  it('B2: reabrir conta EXCLUÍDA é recusado — a exclusão não tem volta', () => {
    const deleted = softDelete(closedAccount());
    assert.ok(isOk(deleted));

    const r = reopen(deleted.value);
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-account-not-closed');
  });

  // Ida e volta sem perda: encerrar e reabrir devolve a conta ao estado inicial.
  it('o ciclo Active → Closed → Active preserva o agregado inteiro', () => {
    const before = account();
    const closed = close(before);
    assert.ok(isOk(closed));
    const back = reopen(closed.value);
    assert.ok(isOk(back));

    assert.deepEqual(back.value, before);
  });
});

describe('cedente-account — excluir (#995 B3)', () => {
  it('Closed → Deleted', () => {
    const r = softDelete(closedAccount());

    assert.ok(isOk(r));
    assert.equal(r.value.status, 'Deleted');
    assert.ok(isDeleted(r.value));
    assert.ok(!isClosed(r.value));
  });

  // ⚠️ SOFT delete: o agregado permanece inteiro. Remessa, conciliação e extrato apontam para esta
  // conta, e as FKs do módulo são `RESTRICT` — apagar de verdade destruiria o rastro do que foi
  // enviado ao banco, que é o que essas tabelas existem para guardar.
  it('B3: excluir preserva o agregado — só o status muda', () => {
    const before = closedAccount();
    const r = softDelete(before);

    assert.ok(isOk(r));
    assert.deepEqual(r.value, { ...before, status: 'Deleted' });
  });

  it('B3: excluir conta ATIVA é recusado — encerre antes', () => {
    const r = softDelete(account());

    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-account-not-closed-for-delete');
  });

  // Slug próprio, e não o `not-closed-for-delete`: quem já excluiu não precisa "encerrar antes".
  it('B3: excluir conta JÁ excluída tem recusa própria', () => {
    const deleted = softDelete(closedAccount());
    assert.ok(isOk(deleted));

    const again = softDelete(deleted.value);
    assert.ok(isErr(again));
    assert.equal(again.error, 'cedente-account-already-deleted');
  });

  // O terceiro estado não confunde os predicados existentes — quem perguntava "está ativa?" continua
  // recebendo `false`, e não passa a receber `true` por a conta ter saído do grid.
  it('conta excluída não é ativa nem encerrada', () => {
    const deleted = softDelete(closedAccount());
    assert.ok(isOk(deleted));

    assert.equal(isActive(deleted.value), false);
    assert.equal(isClosed(deleted.value), false);
    assert.equal(isDeleted(deleted.value), true);
  });
});

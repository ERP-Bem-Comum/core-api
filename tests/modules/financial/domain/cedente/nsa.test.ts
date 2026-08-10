import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create } from '#src/modules/financial/domain/cedente/cedente-account.ts';
// W0 RED: o VO Nsa e a alocação no agregado ainda não existem.
import * as Nsa from '#src/modules/financial/domain/cedente/nsa.ts';
import { allocateNsa } from '#src/modules/financial/domain/cedente/cedente-account.ts';

const account = (nextNsa: number, status: 'Active' | 'Closed' = 'Active') => {
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '1234567',
    document: '12345678000199',
    nextNsa,
    status,
  });
  assert.ok(isOk(r));
  return r.value;
};

describe('Nsa — a faixa vem do layout, não de gosto', () => {
  // O campo NSA do CNAB 240 tem SEIS dígitos (header de arquivo, posições 158-163). Um NSA de
  // 1.000.000 não cabe: sem este teto no domínio, o defeito só apareceria na hora de escrever o
  // arquivo, com a remessa já montada.
  it('aceita a faixa que cabe no campo', () => {
    assert.ok(isOk(Nsa.rehydrate(1)));
    assert.ok(isOk(Nsa.rehydrate(999_999)));
  });

  it('recusa o que não cabe ou não faz sentido', () => {
    for (const bad of [0, -1, 1_000_000, 1.5, Number.NaN]) {
      assert.ok(isErr(Nsa.rehydrate(bad)), `deveria recusar ${String(bad)}`);
    }
  });

  it('expõe o teto para quem precisa avisar antes de esgotar', () => {
    assert.equal(Nsa.MAX, 999_999);
  });
});

describe('allocateNsa — consome o número e avança a conta', () => {
  it('devolve o NSA corrente e a conta já apontando para o próximo', () => {
    const r = allocateNsa(account(7));
    assert.ok(isOk(r));
    assert.equal(r.value.nsa, 7);
    assert.equal(r.value.account.nextNsa, 8);
  });

  it('não muta a conta original — o agregado é imutável', () => {
    const original = account(7);
    const r = allocateNsa(original);
    assert.ok(isOk(r));
    assert.equal(original.nextNsa, 7);
  });

  it('duas alocações em sequência nunca repetem o número', () => {
    const first = allocateNsa(account(1));
    assert.ok(isOk(first));
    const second = allocateNsa(first.value.account);
    assert.ok(isOk(second));

    assert.equal(first.value.nsa, 1);
    assert.equal(second.value.nsa, 2);
  });

  it('entrega o último número da faixa e só então se recusa a continuar', () => {
    const last = allocateNsa(account(Nsa.MAX));
    assert.ok(isOk(last));
    assert.equal(last.value.nsa, Nsa.MAX);

    // A conta ficou apontando para fora da faixa: a próxima remessa precisa de decisão humana
    // (o layout não diz se o NSA cicla), e falhar aqui é melhor que emitir número truncado.
    const exhausted = allocateNsa(last.value.account);
    assert.ok(isErr(exhausted));
    assert.equal(exhausted.error, 'nsa-exhausted');
  });

  it('recusa alocar em conta encerrada', () => {
    const r = allocateNsa(account(5, 'Closed'));
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-account-not-active');
  });
});

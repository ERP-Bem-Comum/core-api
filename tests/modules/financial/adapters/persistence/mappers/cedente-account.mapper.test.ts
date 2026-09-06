import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';
// W0 RED: o mapper ainda não existe.
import {
  toRow,
  toDomain,
} from '#src/modules/financial/adapters/persistence/mappers/cedente-account.mapper.ts';

const buildAccount = (): CedenteAccount => {
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!r.ok) throw new Error('test setup: cedente');
  return r.value;
};

const rowOf = (
  account: CedenteAccount,
  overrides: Partial<Record<'status' | 'id', string>> = {},
) => ({
  id: account.id as string,
  bankCode: account.bankCode,
  agency: account.agency,
  accountNumber: account.accountNumber,
  accountDigit: account.accountDigit,
  convenio: account.convenio,
  document: account.document,
  status: account.status as string,
  // #995 B4 — o discriminador da UNIQUE de chave natural. `'LIVE'` no fixture porque o padrão é a
  // conta viva; os casos de exclusão passam o próprio id, que é o que o mapper deriva.
  naturalKeySlot: account.status === 'Deleted' ? (account.id as string) : 'LIVE',
  nextNsa: account.nextNsa,
  // #856 — DV da agência (posição 058); nullable, e a conta migrada nasce sem ele.
  agencyDigit: account.agencyDigit ?? null,
  // Extensão conciliação (019) — colunas nullable; default null no fixture.
  type: account.type ?? null,
  typeLabel: account.typeLabel ?? null,
  nickname: account.nickname ?? null,
  bankName: account.bankName ?? null,
  openingBalanceCents: account.openingBalanceCents ?? null,
  openingBalanceDate: account.openingBalanceDate ?? null,
  ...overrides,
});

// Critérios em .claude/.pipeline/FIN-CEDENTE-ACCOUNT-PERSIST/000-request.md (CA1–CA4).
describe('financial/adapters/persistence/mappers/cedente-account.mapper', () => {
  it('CA1: round-trip toDomain(rowOf(account)) reconstrói os campos', () => {
    const account = buildAccount();
    const back = toDomain(rowOf(account));
    assert.equal(back.ok, true);
    if (back.ok) {
      assert.equal(back.value.id, account.id);
      assert.equal(back.value.bankCode, account.bankCode);
      assert.equal(back.value.status, account.status);
      assert.equal(back.value.nextNsa, account.nextNsa);
    }
  });

  it('CA2: status inválido na row → err', () => {
    const back = toDomain(rowOf(buildAccount(), { status: 'Bogus' }));
    assert.equal(isErr(back), true);
  });

  it('CA3: id não-UUID na row → err', () => {
    const back = toDomain(rowOf(buildAccount(), { id: 'not-a-uuid' }));
    assert.equal(isErr(back), true);
  });

  it('CA4: toRow produz a row com os campos do schema', () => {
    const account = buildAccount();
    const row = toRow(account);
    assert.equal(row.id, account.id);
    assert.equal(row.bankCode, account.bankCode);
    assert.equal(row.status, account.status);
    assert.equal(row.nextNsa, account.nextNsa);
  });

  // #856 — o DV da agência atravessa os dois sentidos. Sem isto, o dígito seria aceito pela borda,
  // sobreviveria ao domínio e morreria calado no mapper, que é o defeito que a issue descreve.
  it('#856: o DV da agência faz round-trip domínio → row → domínio', () => {
    const account: CedenteAccount = { ...buildAccount(), agencyDigit: '5' };
    assert.equal(toRow(account).agencyDigit, '5');

    const back = toDomain(rowOf(account));
    assert.equal(back.ok, true);
    if (back.ok) assert.equal(back.value.agencyDigit, '5');
  });

  // Ausência é AUSÊNCIA nas duas direções: `null` na coluna vira campo ausente no agregado, e campo
  // ausente vira `null` na coluna. É o que mantém "a agência não tem DV" distinto de "o DV é vazio".
  it('#856: DV ausente vira null na row, e null volta como ausente', () => {
    const account = buildAccount();
    assert.equal(toRow(account).agencyDigit, null);

    const back = toDomain(rowOf(account));
    assert.equal(back.ok, true);
    if (back.ok) assert.equal(back.value.agencyDigit, undefined);
  });

  // Linha antiga com string vazia — o que uma versão anterior do front gravaria. A re-hidratação NÃO
  // passa pelo construtor, então sem esta normalização a conta voltaria como "DV definido" e a
  // edição recusaria preenchê-lo, devolvendo o operador ao beco da #942/#943.
  it('#856: string vazia na coluna re-hidrata como ausente, não como dígito definido', () => {
    const back = toDomain({ ...rowOf(buildAccount()), agencyDigit: '  ' });
    assert.equal(back.ok, true);
    if (back.ok) assert.equal(back.value.agencyDigit, undefined);
  });

  /*
   * ⚠️ O VALOR RE-HIDRATADO É O APARADO — dois defeitos numa linha só, e nenhum dos dois aparece
   * num teste que monte o agregado em memória (a via que o construtor já apara).
   *
   *   1. `text(' 5', 1)` devolve `' '`: a 058 sai em BRANCO com o dígito presente no banco.
   *   2. `wantsAgencyDigitSwap` compara contra o `'5'` que o construtor e a edição gravam, então
   *      reenviar o MESMO dígito lê como troca e dispara a trava FR-008.
   *
   * Padding chega por qualquer via que não passe pelo construtor: dump restaurado, correção manual
   * no banco, ETL futuro.
   */
  it('#856: dígito com espaço na coluna re-hidrata APARADO, e não bruto', () => {
    const back = toDomain({ ...rowOf(buildAccount()), agencyDigit: ' 5' });
    assert.equal(back.ok, true);
    if (back.ok) assert.equal(back.value.agencyDigit, '5');
  });
});

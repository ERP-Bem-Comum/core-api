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
  nextNsa: account.nextNsa,
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
});

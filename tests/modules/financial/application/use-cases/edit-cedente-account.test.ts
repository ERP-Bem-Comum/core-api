import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
// W0 RED (019): o use-case editCedenteAccount ainda não existe.
import { editCedenteAccount } from '#src/modules/financial/application/use-cases/edit-cedente-account.ts';

const buildAccount = () => {
  const r = createCedente({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!r.ok) throw new Error('setup: cedente');
  return r.value;
};

// FR-008: a edição depende de a conta ter histórico (extrato importado / conciliações).
const deps = (account: unknown, hasHistory: boolean) => ({
  cedenteStore: {
    findById: (): Promise<Result<unknown, never>> => Promise.resolve(ok(account)),
    save: (): Promise<Result<void, never>> => Promise.resolve(ok(undefined)),
  },
  accountHistory: {
    hasActivity: (): Promise<Result<boolean, never>> => Promise.resolve(ok(hasHistory)),
  },
});

describe('financial/application/edit-cedente-account (019) — W0 RED', () => {
  it('CA-US3: sem histórico → edita dados bancários (agência)', async () => {
    const account = buildAccount();
    const r = await editCedenteAccount(deps(account, false) as never)({
      id: String(account.id),
      agency: '4321',
      nickname: 'Conta renomeada',
    });
    assert.equal(r.ok, true);
  });

  it('CA-US3/FR-008: com histórico, alterar dados bancários → cedente-account-bank-data-locked', async () => {
    const account = buildAccount();
    const r = await editCedenteAccount(deps(account, true) as never)({
      id: String(account.id),
      agency: '4321',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-bank-data-locked');
  });

  it('CA-US3/FR-008: com histórico, alterar só apelido/bankName → ok', async () => {
    const account = buildAccount();
    const r = await editCedenteAccount(deps(account, true) as never)({
      id: String(account.id),
      nickname: 'Apelido novo',
      bankName: 'Banco X',
    });
    assert.equal(r.ok, true);
  });
});

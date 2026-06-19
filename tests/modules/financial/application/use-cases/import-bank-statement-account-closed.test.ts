import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create as createCedente,
  close,
} from '#src/modules/financial/domain/cedente/cedente-account.ts';
import { importBankStatement } from '#src/modules/financial/application/use-cases/import-bank-statement.ts';

// W0 RED (019/FR-011): hoje o import NÃO carrega a conta-cedente nem checa status encerrado.
// O guard deve ser adicionado (espelhando confirm-reconciliation), com `cedenteStore` nos deps.

const closedAccount = () => {
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
  const c = close(r.value);
  if (!c.ok) throw new Error('setup: close');
  return c.value;
};

const fail = (label: string): never => {
  throw new Error(`não deve ser chamado quando a conta está encerrada: ${label}`);
};

describe('financial/application/import-bank-statement — guard conta encerrada (019/FR-011) — W0 RED', () => {
  it('conta encerrada → account-closed, sem parsear/persistir', async () => {
    const acc = closedAccount();
    const deps = {
      parser: { parse: () => fail('parser.parse') },
      repo: { has: () => fail('repo.has'), save: () => fail('repo.save') },
      periods: { isClosed: (): Promise<Result<boolean, never>> => Promise.resolve(ok(false)) },
      clock: { now: () => new Date('2026-06-19T00:00:00.000Z') },
      outbox: { append: () => fail('outbox.append') },
      cedenteStore: {
        findById: (): Promise<Result<unknown, never>> => Promise.resolve(ok(acc)),
      },
    };
    const r = await importBankStatement(deps as never)({
      debitAccountRef: String(acc.id),
      format: 'OFX',
      content: '<OFX></OFX>',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'account-closed');
  });
});

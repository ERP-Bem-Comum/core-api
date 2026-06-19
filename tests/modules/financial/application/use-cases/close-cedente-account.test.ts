import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create as createCedente,
  close,
} from '#src/modules/financial/domain/cedente/cedente-account.ts';
// W0 RED (019): o use-case closeCedenteAccount ainda não existe.
import { closeCedenteAccount } from '#src/modules/financial/application/use-cases/close-cedente-account.ts';

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

describe('financial/application/close-cedente-account (019) — W0 RED', () => {
  it('CA-US2: encerra conta ativa → status Closed e persiste', async () => {
    const account = buildAccount();
    const saved: unknown[] = [];
    const store = {
      findById: (): Promise<Result<unknown, never>> => Promise.resolve(ok(account)),
      save: (a: unknown): Promise<Result<void, never>> => {
        saved.push(a);
        return Promise.resolve(ok(undefined));
      },
    };
    const r = await closeCedenteAccount({ cedenteStore: store } as never)({
      id: String(account.id),
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal((r.value as { status: string }).status, 'Closed');
    assert.equal(saved.length, 1);
  });

  it('CA-US2: conta já encerrada → cedente-account-already-closed', async () => {
    const closed = close(buildAccount());
    if (!closed.ok) throw new Error('setup');
    const store = {
      findById: (): Promise<Result<unknown, never>> => Promise.resolve(ok(closed.value)),
      save: (): Promise<Result<void, never>> => Promise.resolve(ok(undefined)),
    };
    const r = await closeCedenteAccount({ cedenteStore: store } as never)({
      id: String(closed.value.id),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-already-closed');
  });

  it('CA-US2: conta inexistente → cedente-account-not-found', async () => {
    const store = {
      findById: (): Promise<Result<unknown, never>> => Promise.resolve(ok(null)),
      save: (): Promise<Result<void, never>> => Promise.resolve(ok(undefined)),
    };
    const r = await closeCedenteAccount({ cedenteStore: store } as never)({
      id: String(CedenteAccountId.generate()),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-not-found');
  });
});

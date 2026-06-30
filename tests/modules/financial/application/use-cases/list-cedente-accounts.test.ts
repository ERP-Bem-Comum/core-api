import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
// W0 RED (019): o use-case listCedenteAccounts ainda não existe.
import { listCedenteAccounts } from '#src/modules/financial/application/use-cases/list-cedente-accounts.ts';

describe('financial/application/list-cedente-accounts (019) — W0 RED', () => {
  it('CA-US1: lista todas as contas do store', async () => {
    const accounts = [{ id: 'a1' }, { id: 'a2' }];
    const store = {
      list: (): Promise<Result<readonly unknown[], never>> => Promise.resolve(ok(accounts)),
    };
    const r = await listCedenteAccounts({ cedenteStore: store } as never)();
    assert.equal(r.ok, true);
    if (r.ok) assert.equal((r.value as unknown[]).length, 2);
  });

  it('CA-US1: store vazio → lista vazia', async () => {
    const store = {
      list: (): Promise<Result<readonly unknown[], never>> => Promise.resolve(ok([])),
    };
    const r = await listCedenteAccounts({ cedenteStore: store } as never)();
    assert.equal(r.ok, true);
    if (r.ok) assert.equal((r.value as unknown[]).length, 0);
  });
});

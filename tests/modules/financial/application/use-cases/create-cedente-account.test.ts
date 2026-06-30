import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
// W0 RED (019): o use-case createCedenteAccount ainda não existe.
import { createCedenteAccount } from '#src/modules/financial/application/use-cases/create-cedente-account.ts';

const baseInput = (over: Record<string, unknown> = {}) => ({
  bankCode: '237',
  bankName: 'Bradesco',
  type: 'corrente',
  agency: '1234',
  accountNumber: '567890',
  accountDigit: '1',
  document: '12345678000190',
  nickname: 'Conta principal',
  ...over,
});

const fakeStore = (opts: { duplicate?: boolean } = {}) => {
  const saved: unknown[] = [];
  const store = {
    findByNaturalKey: (): Promise<Result<unknown, never>> =>
      Promise.resolve(ok(opts.duplicate === true ? { id: 'existing' } : null)),
    save: (a: unknown): Promise<Result<void, never>> => {
      saved.push(a);
      return Promise.resolve(ok(undefined));
    },
    findById: (): Promise<Result<unknown, never>> => Promise.resolve(ok(null)),
    list: (): Promise<Result<readonly unknown[], never>> => Promise.resolve(ok([])),
  };
  return { store, saved };
};

describe('financial/application/create-cedente-account (019) — W0 RED', () => {
  it('CA-US1: cria conta válida → ok com id; persiste', async () => {
    const { store, saved } = fakeStore();
    const r = await createCedenteAccount({ cedenteStore: store } as never)(baseInput());
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(typeof (r.value as { id: string }).id, 'string');
    assert.equal(saved.length, 1);
  });

  it('CA-US1/FR-016: conta duplicada (mesma chave natural) → cedente-account-duplicate', async () => {
    const { store, saved } = fakeStore({ duplicate: true });
    const r = await createCedenteAccount({ cedenteStore: store } as never)(baseInput());
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-duplicate');
    assert.equal(saved.length, 0);
  });

  it('CA-US1: type inválido → invalid-account-type', async () => {
    const { store } = fakeStore();
    const r = await createCedenteAccount({ cedenteStore: store } as never)(
      baseInput({ type: 'salario' }),
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-account-type');
  });

  it('CA-US4: saldo de abertura sem data → opening-balance-requires-date', async () => {
    const { store } = fakeStore();
    const r = await createCedenteAccount({ cedenteStore: store } as never)(
      baseInput({ openingBalanceCents: '150000' }),
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'opening-balance-requires-date');
  });
});

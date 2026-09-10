/**
 * `withRbacBypass` — sob `AUTH_RBAC_MODE=bypass` (ADR-0052) a `approval-policy` deixa de barrar por
 * PERMISSÃO, para não contradizer o `/me`, que já anuncia o catálogo inteiro.
 *
 * O que este arquivo fixa são os LIMITES da decisão, que é onde ela pode ser desfeita por engano:
 * o teto continua valendo, usuário inexistente continua inexistente, e `list` (candidatos da
 * cascata) passa intacto. Função pura sobre o port — sem infra, sem MySQL.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { withRbacBypass } from '#src/modules/financial/adapters/read/approver-authority-reader.rbac-bypass.ts';
import type { ApproverAuthorityReader } from '#src/modules/financial/application/ports/approver-authority-reader.ts';
import type { ApproverAuthority } from '#src/modules/financial/domain/document/approval-policy.ts';

const money = (cents: number): Money.Money => {
  const m = Money.fromCents(cents);
  assert.equal(m.ok, true);
  if (!m.ok) throw new Error('unreachable');
  return m.value;
};

const readerOf = (
  authority: ApproverAuthority | null,
  list: readonly ApproverAuthority[] = [],
): ApproverAuthorityReader => ({
  get: () => Promise.resolve(ok(authority)),
  list: () => Promise.resolve(ok(list)),
});

describe('withRbacBypass — o bypass afrouxa permissão, e só ela', () => {
  it('canApprove false vira true: e a recusa que contradizia o /me', async () => {
    const reader = withRbacBypass(readerOf({ userId: 'u-1', canApprove: false, limit: null }));

    const authority = await reader.get('u-1');

    assert.equal(authority.ok, true);
    if (!authority.ok) return;
    assert.equal(authority.value?.canApprove, true);
  });

  it('o TETO passa intacto: quem tem papel com alçada continua limitado por ela (#299/#609)', async () => {
    const reader = withRbacBypass(
      readerOf({ userId: 'u-1', canApprove: false, limit: money(50_000) }),
    );

    const authority = await reader.get('u-1');

    assert.equal(authority.ok, true);
    if (!authority.ok) return;
    assert.deepEqual(authority.value?.limit, money(50_000));
  });

  it('null continua null: bypass nao inventa usuario que o auth nao conhece', async () => {
    const reader = withRbacBypass(readerOf(null));

    const authority = await reader.get('quem-nao-existe');

    assert.equal(authority.ok, true);
    if (!authority.ok) return;
    assert.equal(authority.value, null);
  });

  it('falha de leitura propaga: bypass nao mascara indisponibilidade do auth', async () => {
    const failing: ApproverAuthorityReader = {
      get: () => Promise.resolve(err('approver-authority-unavailable')),
      list: () => Promise.resolve(ok([])),
    };

    const authority = await withRbacBypass(failing).get('u-1');

    assert.equal(authority.ok, false);
    if (authority.ok) return;
    assert.equal(authority.error, 'approver-authority-unavailable');
  });

  it('list passa intacto: candidato da cascata segue sendo quem TEM papel aprovador', async () => {
    const candidates: readonly ApproverAuthority[] = [
      { userId: 'sem-papel', canApprove: false, limit: null },
      { userId: 'com-papel', canApprove: true, limit: money(10_000) },
    ];
    const reader = withRbacBypass(readerOf(null, candidates));

    const listed = await reader.list();

    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.deepEqual(
      listed.value.map((c) => c.canApprove),
      [false, true],
      'o decorator nao pode transformar todo mundo em candidato de escalacao',
    );
  });
});

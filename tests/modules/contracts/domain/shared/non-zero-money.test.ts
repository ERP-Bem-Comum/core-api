/**
 * CTR-DOMAIN-INVARIANT-CONTEXTUAL — W0 RED
 *
 * Testa o VO `NonZeroMoney` (rota α, DO D§25).
 *
 * Estado W0 (RED): `src/modules/contracts/domain/shared/non-zero-money.ts` ainda
 * não existe → todos os testes falham com
 * "Cannot find module '#src/shared/kernel/non-zero-money.ts'".
 *
 * Estado W1 (GREEN): o módulo é criado → todos os testes passam.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
// W0 RED: este import falhará com "Cannot find module" até W1 criar o arquivo.
import * as NonZeroMoney from '#src/shared/kernel/non-zero-money.ts';

// ─── Helpers de fixture ───────────────────────────────────────────────────────

const money = (cents: number): Money.Money => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};

// ============================================================================
// CA1 / CA2 — smart constructor `NonZeroMoney.from`
// ============================================================================

describe('NonZeroMoney.from — happy path (CA1/CA2)', () => {
  it('retorna ok para cents > 0 (positivo)', () => {
    // Arrange
    const m = money(500_000);
    // Act
    const r = NonZeroMoney.from(m);
    // Assert
    assert.equal(isOk(r), true, 'NonZeroMoney.from deve retornar ok para cents > 0');
    if (!r.ok) return;
    assert.equal(r.value.cents, 500_000, 'cents deve ser preservado no NonZeroMoney');
  });

  it('retorna ok para cents = 1 (valor mínimo válido)', () => {
    // Arrange
    const m = money(1);
    // Act
    const r = NonZeroMoney.from(m);
    // Assert
    assert.equal(isOk(r), true, 'NonZeroMoney.from deve retornar ok para cents = 1');
    if (!r.ok) return;
    assert.equal(r.value.cents, 1);
  });

  it('retorna ok para cents = Number.MAX_SAFE_INTEGER (valor máximo válido de Money)', () => {
    // Arrange
    const m = money(Number.MAX_SAFE_INTEGER);
    // Act
    const r = NonZeroMoney.from(m);
    // Assert
    assert.equal(isOk(r), true, 'NonZeroMoney.from deve retornar ok para MAX_SAFE_INTEGER');
  });
});

describe('NonZeroMoney.from — rejeições (CA2)', () => {
  it("retorna err('money-must-be-non-zero') para cents === 0", () => {
    // Arrange
    const m = Money.ZERO; // Money com cents = 0
    // Act
    const r = NonZeroMoney.from(m);
    // Assert
    assert.equal(isErr(r), true, 'NonZeroMoney.from deve rejeitar Money.ZERO');
    if (r.ok) return;
    assert.equal(r.error, 'money-must-be-non-zero', "erro deve ser 'money-must-be-non-zero'");
  });
});

// ============================================================================
// CA5 — Polimorfismo Money / NonZeroMoney
// ============================================================================

describe('NonZeroMoney — polimorfismo com Money (CA5)', () => {
  it('NonZeroMoney é compatível com Money em widening — Money.add aceita NonZeroMoney sem cast', () => {
    // Arrange
    const nonZeroR = NonZeroMoney.from(money(300_000));
    assert.equal(isOk(nonZeroR), true, 'fixture broken: NonZeroMoney.from deve retornar ok');
    if (!nonZeroR.ok) return;
    const nonZero = nonZeroR.value; // NonZeroMoney
    const other = money(200_000); // Money

    // Act — NonZeroMoney → Money é widening automático (rota α DO D§25).
    // Money.add(a: Money, b: Money) aceita NonZeroMoney sem cast.
    const sum = Money.add(nonZero, other);

    // Assert
    assert.equal(sum.cents, 500_000, 'Money.add(nonZero, money) deve somar os cents');
  });

  it('NonZeroMoney + NonZeroMoney via Money.add produz Money válido', () => {
    // Arrange
    const r1 = NonZeroMoney.from(money(100_000));
    const r2 = NonZeroMoney.from(money(250_000));
    assert.equal(isOk(r1), true);
    assert.equal(isOk(r2), true);
    if (!r1.ok || !r2.ok) return;

    // Act
    const sum = Money.add(r1.value, r2.value);

    // Assert
    assert.equal(sum.cents, 350_000);
  });

  it('Money.equals aceita NonZeroMoney sem cast (widening automático)', () => {
    // Arrange
    const nonZeroR = NonZeroMoney.from(money(500_000));
    assert.equal(isOk(nonZeroR), true);
    if (!nonZeroR.ok) return;
    const nonZero = nonZeroR.value;
    const other = money(500_000);

    // Act — Money.equals(a: Money, b: Money) aceita NonZeroMoney via widening
    const result = Money.equals(nonZero, other);

    // Assert
    assert.equal(result, true, 'Money.equals deve funcionar com NonZeroMoney via widening');
  });

  // CA5 — verificação estática: Money cru NÃO é assignable a NonZeroMoney (widening reverso bloqueado).
  // Em W0 RED: `NonZeroMoney.NonZeroMoney` não existe → @ts-expect-error pode ser "Cannot find namespace".
  // Em W1 GREEN: @ts-expect-error suprime o erro real de atribuição direta Money → NonZeroMoney.
  it('TS bloqueia atribuição direta Money → NonZeroMoney (widening reverso — CA5 tipo)', () => {
    const m = money(500_000); // tipo: Money

    // @ts-expect-error — Money não é assignable a NonZeroMoney sem passar pelo smart constructor.
    // W0 RED: @ts-expect-error suprime "Cannot find namespace 'NonZeroMoney'" no tipo abaixo.
    // W1 GREEN: @ts-expect-error suprime o erro real "Type 'Money' is not assignable to type 'NonZeroMoney'".
    const _nzm: NonZeroMoney.NonZeroMoney = m;
    void _nzm;

    // Se chegou aqui em runtime, o teste "passou" estruturalmente —
    // a verificação real é em compile time via @ts-expect-error.
    assert.ok(
      true,
      'verificação estática: @ts-expect-error garante que atribuição direta é bloqueada em compile time',
    );
  });
});

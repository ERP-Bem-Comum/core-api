import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';

// CPF válido (DV 3-5, conferido pelo módulo 11). Bare e mascarado.
const VALID_BARE = '11144477735';
const VALID_MASKED = '111.444.777-35';

describe('Cpf — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as Cpf` (Padrão D smoke)', () => {
    const ns: Readonly<Record<string, unknown>> = Cpf;
    // VO do kernel: smart constructor `parse`; NÃO expõe `generate` (CPF vem de fora).
    assert.equal(typeof ns.parse, 'function');
    assert.equal(ns.generate, undefined);
  });

  it("does NOT expose a nested `Cpf` namespace-object (DON'T B§7)", () => {
    const ns: Readonly<Record<string, unknown>> = Cpf;
    assert.equal(ns.Cpf, undefined);
  });
});

describe('Cpf — parse', () => {
  it('aceita CPF válido bare', () => {
    const r = Cpf.parse(VALID_BARE);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_BARE);
  });

  it('aceita CPF válido mascarado e normaliza para 11 dígitos', () => {
    const r = Cpf.parse(VALID_MASKED);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_BARE);
  });

  it('rejeita comprimento != 11', () => {
    assert.equal(isErr(Cpf.parse('123')), true);
    assert.equal(isErr(Cpf.parse('111444777350')), true);
  });

  it('rejeita dígitos verificadores incorretos', () => {
    const r = Cpf.parse('11144477700');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-cpf');
  });

  it('rejeita sequência de dígito repetido', () => {
    assert.equal(isErr(Cpf.parse('11111111111')), true);
    assert.equal(isErr(Cpf.parse('00000000000')), true);
  });

  it('rejeita não-dígitos e string vazia', () => {
    assert.equal(isErr(Cpf.parse('abc')), true);
    assert.equal(isErr(Cpf.parse('')), true);
  });
});

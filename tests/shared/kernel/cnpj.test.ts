import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { isValidCnpj } from '#src/shared/kernel/cnpj.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';

const VALID_BARE = '11222333000181';
const VALID_MASKED = '11.222.333/0001-81';

describe('isValidCnpj', () => {
  it('aceita CNPJ válido bare', () => {
    assert.equal(isValidCnpj('11222333000181'), true);
  });

  it('aceita CNPJ válido mascarado', () => {
    assert.equal(isValidCnpj('11.222.333/0001-81'), true);
  });

  it('rejeita comprimento != 14', () => {
    assert.equal(isValidCnpj('123'), false);
    assert.equal(isValidCnpj('112223330001810'), false);
  });

  it('rejeita dígitos verificadores incorretos', () => {
    assert.equal(isValidCnpj('11222333000180'), false);
  });

  it('rejeita sequência de dígito repetido', () => {
    assert.equal(isValidCnpj('11111111111111'), false);
    assert.equal(isValidCnpj('00000000000000'), false);
  });

  it('rejeita não-dígitos que não formam 14 dígitos', () => {
    assert.equal(isValidCnpj('abc'), false);
    assert.equal(isValidCnpj(''), false);
  });
});

describe('Cnpj — VO (module-as-namespace, Padrão D)', () => {
  it('expõe `parse` e NÃO expõe `generate`', () => {
    const ns: Readonly<Record<string, unknown>> = Cnpj;
    assert.equal(typeof ns.parse, 'function');
    assert.equal(ns.generate, undefined);
  });

  it('mantém `isValidCnpj` exportado (sem regressão no import de contratos)', () => {
    assert.equal(typeof Cnpj.isValidCnpj, 'function');
  });

  it('aceita CNPJ válido bare', () => {
    const r = Cnpj.parse(VALID_BARE);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_BARE);
  });

  it('aceita CNPJ válido mascarado e normaliza para 14 dígitos', () => {
    const r = Cnpj.parse(VALID_MASKED);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_BARE);
  });

  it('rejeita CNPJ inválido com erro kebab', () => {
    const r = Cnpj.parse('11222333000180');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-cnpj');
  });
});

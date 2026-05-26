import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isValidCnpj } from '#src/shared/kernel/cnpj.ts';

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

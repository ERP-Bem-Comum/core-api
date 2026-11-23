import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  CONTRACTS_PUBLIC_MESSAGES,
  type ContractsErrorCode,
} from '#src/modules/contracts/adapters/http/error-messages.ts';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('CONTRACTS_PUBLIC_MESSAGES — mensagem pública de cada erro do plugin', () => {
  it('as chaves da tabela são exatamente a união de códigos que o plugin devolve', () => {
    const typed: Equals<keyof typeof CONTRACTS_PUBLIC_MESSAGES, ContractsErrorCode> = true;
    assert.equal(typed, true);
  });

  it('cobre os 105 códigos dos use cases mais os 2 que o plugin emite direto', () => {
    assert.equal(Object.keys(CONTRACTS_PUBLIC_MESSAGES).length, 107);
    assert.ok(Object.hasOwn(CONTRACTS_PUBLIC_MESSAGES, 'document-magic-bytes-mismatch'));
    assert.ok(Object.hasOwn(CONTRACTS_PUBLIC_MESSAGES, 'document-contract-mismatch'));
  });

  for (const [code, message] of Object.entries(CONTRACTS_PUBLIC_MESSAGES)) {
    it(`${code}: a mensagem é uma frase PT-BR, não o código`, () => {
      assert.notEqual(message, code);
      assert.equal(message.includes(code), false, 'a mensagem não cita o código interno');
      assert.match(message, /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ].* .*\.$/u);
    });
  }
});

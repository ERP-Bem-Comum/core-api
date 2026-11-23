import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  BUDGET_PLANS_PUBLIC_MESSAGES,
  type BudgetPlansErrorCode,
} from '#src/modules/budget-plans/adapters/http/error-messages.ts';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('BUDGET_PLANS_PUBLIC_MESSAGES — mensagem pública de cada erro do plugin', () => {
  it('as chaves da tabela são exatamente a união de códigos que o plugin devolve', () => {
    const typed: Equals<keyof typeof BUDGET_PLANS_PUBLIC_MESSAGES, BudgetPlansErrorCode> = true;
    assert.equal(typed, true);
  });

  it('cobre os 55 códigos que os use cases do plugin devolvem hoje', () => {
    assert.equal(Object.keys(BUDGET_PLANS_PUBLIC_MESSAGES).length, 55);
  });

  for (const [code, message] of Object.entries(BUDGET_PLANS_PUBLIC_MESSAGES)) {
    it(`${code}: a mensagem é uma frase PT-BR, não o código`, () => {
      assert.notEqual(message, code);
      assert.equal(message.includes(code), false, 'a mensagem não cita o código interno');
      assert.match(message, /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ].* .*\.$/u);
    });
  }
});

// Repetição de transação vítima de deadlock (#803, CA3).
//
// O InnoDB, ao detectar um ciclo, escolhe uma vítima, reverte a transação DELA por inteiro e
// deixa a outra seguir. Repetir a vítima é a resposta canônica: não há nada errado com o
// pedido, ele apenas perdeu uma corrida. Refman 8.4 §15.7.5: "Always be prepared to re-issue
// a transaction if it fails due to deadlock."
//
// ⚠️ O CA3 da issue pede repetir "em deadlock/lock-wait". Este módulo repete SÓ em deadlock,
// deliberadamente — ver o teste "não repete lock-wait timeout" abaixo para o porquê.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  withDeadlockRetry,
  DEFAULT_DEADLOCK_RETRY,
  type DeadlockRetryPolicy,
} from '#src/shared/persistence/retry-on-deadlock.ts';

const mysqlError = (errno: number, code: string): Error => {
  const e = new Error(`ER: ${code}`);
  Object.assign(e, { errno, code });
  return e;
};

const drizzleWrap = (cause: unknown): Error => {
  const e = new Error('Failed query: insert into `fin_retentions` ...\nparams: ');
  (e as { cause?: unknown }).cause = cause;
  return e;
};

const deadlock = (): Error => drizzleWrap(mysqlError(1213, 'ER_LOCK_DEADLOCK'));
const lockWait = (): Error => drizzleWrap(mysqlError(1205, 'ER_LOCK_WAIT_TIMEOUT'));
const dupEntry = (): Error => drizzleWrap(mysqlError(1062, 'ER_DUP_ENTRY'));

// Política determinística: sem espera real, para o teste não depender de relógio.
const instant = (maxAttempts: number): DeadlockRetryPolicy => ({
  maxAttempts,
  delayMsFor: () => 0,
});

// Operação que falha `failures` vezes e então devolve `value`, contando as execuções.
const flakyOp = (failures: number, makeError: () => Error, value = 'ok') => {
  let calls = 0;
  // Sem `async`: a função não aguarda nada, e marcá-la `async` só para poder usar `throw`
  // dispara `require-await`. Rejeitar explicitamente deixa o contrato mais honesto.
  const run = (): Promise<string> =>
    calls++ < failures ? Promise.reject(makeError()) : Promise.resolve(value);
  return { run, calls: () => calls };
};

describe('withDeadlockRetry — o que repete e o que não repete', () => {
  it('não repete quando a operação passa de primeira', async () => {
    const op = flakyOp(0, deadlock);

    const result = await withDeadlockRetry(op.run, instant(3));

    assert.equal(result, 'ok');
    assert.equal(op.calls(), 1);
  });

  it('repete a vítima de deadlock e devolve o resultado da tentativa que vence', async () => {
    const op = flakyOp(1, deadlock);

    const result = await withDeadlockRetry(op.run, instant(3));

    assert.equal(result, 'ok');
    assert.equal(op.calls(), 2);
  });

  it('desiste depois de esgotar as tentativas e propaga o erro original', async () => {
    const op = flakyOp(99, deadlock);

    await assert.rejects(
      () => withDeadlockRetry(op.run, instant(3)),
      // O erro que sobe é o do driver, não um erro novo: quem depura precisa do errno.
      (e: unknown) => String(e).includes('Failed query'),
    );
    assert.equal(op.calls(), 3);
  });

  it('NÃO repete lock-wait timeout — repetir empilha espera sobre um lock ainda segurado', async () => {
    // 1205 não é vítima de ciclo: outra transação segue segurando o lock. Uma segunda
    // tentativa espera `innodb_lock_wait_timeout` de novo (50s por padrão) e falha igual —
    // o operador só ganha o dobro do tempo até a mesma mensagem.
    const op = flakyOp(1, lockWait);

    await assert.rejects(() => withDeadlockRetry(op.run, instant(3)));
    assert.equal(op.calls(), 1);
  });

  it('NÃO repete violação de constraint — é defeito de dado, não corrida', async () => {
    const op = flakyOp(1, dupEntry);

    await assert.rejects(() => withDeadlockRetry(op.run, instant(3)));
    assert.equal(op.calls(), 1);
  });

  it('NÃO repete erro que não vem do driver', async () => {
    const op = flakyOp(1, () => new Error('conflito de versão, erro de domínio'));

    await assert.rejects(() => withDeadlockRetry(op.run, instant(3)));
    assert.equal(op.calls(), 1);
  });

  it('consulta a política de espera uma vez por repetição, não por tentativa', async () => {
    // 3 tentativas → 2 esperas. Contar errado aqui adia o request sem motivo.
    const seen: number[] = [];
    const op = flakyOp(99, deadlock);

    await assert.rejects(() =>
      withDeadlockRetry(op.run, {
        maxAttempts: 3,
        delayMsFor: (attempt) => {
          seen.push(attempt);
          return 0;
        },
      }),
    );

    assert.equal(seen.length, 2);
  });
});

describe('DEFAULT_DEADLOCK_RETRY — propriedades que a política tem de ter', () => {
  // Asserção por PROPRIEDADE, nunca por valor exato: fixar `maxAttempts === 3` transformaria
  // um ajuste legítimo de tuning em teste vermelho, sem que nada tivesse quebrado.

  it('tenta mais de uma vez — senão não é retry', () => {
    assert.ok(DEFAULT_DEADLOCK_RETRY.maxAttempts >= 2);
  });

  it('tem teto — um request que move dinheiro não pode repetir indefinidamente', () => {
    assert.ok(DEFAULT_DEADLOCK_RETRY.maxAttempts <= 5);
  });

  it('espera antes de repetir — repetir na hora recolide com quem ganhou a corrida', () => {
    assert.ok(DEFAULT_DEADLOCK_RETRY.delayMsFor(1) > 0);
  });

  it('a espera não encolhe entre tentativas', () => {
    assert.ok(DEFAULT_DEADLOCK_RETRY.delayMsFor(2) >= DEFAULT_DEADLOCK_RETRY.delayMsFor(1));
  });

  it('a espera total cabe folgadamente no orçamento de um request HTTP', () => {
    let total = 0;
    for (let a = 1; a < DEFAULT_DEADLOCK_RETRY.maxAttempts; a += 1) {
      total += DEFAULT_DEADLOCK_RETRY.delayMsFor(a);
    }
    assert.ok(total <= 2000, `espera total ${String(total)}ms deveria caber em 2s`);
  });
});

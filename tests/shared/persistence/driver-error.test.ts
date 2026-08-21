// Desembrulho do erro do driver MySQL por trás do wrapper do Drizzle (#803).
//
// POR QUE ESTE MÓDULO EXISTE
//   `DrizzleQueryError` (drizzle-orm 0.45.2, `errors.js:10-20`) monta a mensagem como
//   `Failed query: <sql>\nparams: <values>` e guarda o erro original do mysql2 em `.cause`.
//   Quem formata esse erro com `String(err)` recebe SÓ a mensagem — `Error.prototype.toString()`
//   devolve `name: message` por contrato, e `cause` nunca entra. O `errno` do MySQL, que é o
//   único dado capaz de distinguir deadlock (1213) de lock-wait timeout (1205), é destruído
//   exatamente ali.
//
//   A distinção não é acadêmica: repetir a transação é a resposta CERTA para a vítima de um
//   deadlock (o InnoDB já reverteu a perdedora e a outra seguiu) e a resposta ERRADA para
//   lock-wait, onde repetir só empilha espera sobre um lock que segue segurado.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  readDriverError,
  isDeadlock,
  isLockWaitTimeout,
  describeDriverError,
} from '#src/shared/persistence/driver-error.ts';

// Reproduz a forma de `DrizzleQueryError` sem depender do pacote: o que importa é o
// contrato observável (mensagem própria + erro do driver em `.cause`).
const drizzleWrap = (sql: string, cause: unknown): Error => {
  const e = new Error(`Failed query: ${sql}\nparams: `);
  (e as { cause?: unknown }).cause = cause;
  return e;
};

// Erro do mysql2: um Error com os campos que o driver anexa.
const mysqlError = (errno: number, code: string, sqlState = '40001'): Error => {
  const e = new Error(`ER: ${code}`);
  Object.assign(e, { errno, code, sqlState, sqlMessage: `mensagem do servidor (${code})` });
  return e;
};

const DEADLOCK = 1213;
const LOCK_WAIT = 1205;

describe('readDriverError — encontra o erro do driver na cadeia de causes', () => {
  it('lê o errno do erro do mysql2 embrulhado pelo Drizzle (profundidade 1)', () => {
    const wrapped = drizzleWrap(
      'insert into `fin_retentions` ...',
      mysqlError(DEADLOCK, 'ER_LOCK_DEADLOCK'),
    );

    const info = readDriverError(wrapped);

    assert.notEqual(info, null);
    assert.equal(info?.errno, DEADLOCK);
    assert.equal(info?.code, 'ER_LOCK_DEADLOCK');
    assert.equal(info?.sqlState, '40001');
  });

  it('lê o erro do driver quando ele chega cru, sem wrapper', () => {
    const info = readDriverError(mysqlError(LOCK_WAIT, 'ER_LOCK_WAIT_TIMEOUT', 'HY000'));

    assert.equal(info?.errno, LOCK_WAIT);
    assert.equal(info?.code, 'ER_LOCK_WAIT_TIMEOUT');
  });

  it('percorre cadeia mais profunda que um nível — a profundidade é do pacote, não nossa', () => {
    // Não fixamos a profundidade do encadeamento do Drizzle: ela pode mudar numa
    // atualização do pacote sem aviso. O contrato é "ache o driver onde ele estiver".
    const deep = drizzleWrap(
      'update ...',
      drizzleWrap('inner', mysqlError(DEADLOCK, 'ER_LOCK_DEADLOCK')),
    );

    assert.equal(readDriverError(deep)?.errno, DEADLOCK);
  });

  it('devolve null quando não há erro de driver na cadeia', () => {
    assert.equal(readDriverError(new Error('falha de domínio, sem driver envolvido')), null);
    assert.equal(readDriverError(drizzleWrap('select 1', new Error('sem errno'))), null);
  });

  it('não quebra com entrada que não é Error', () => {
    assert.equal(readDriverError(null), null);
    assert.equal(readDriverError(undefined), null);
    assert.equal(readDriverError('string solta'), null);
    assert.equal(readDriverError(42), null);
    assert.equal(readDriverError({ errno: 'não é número' }), null);
  });

  it('termina mesmo se a cadeia de causes tiver ciclo', () => {
    // Um `cause` que aponta para si mesmo penduraria um `while` ingênuo. O catch de um
    // adapter roda no caminho de erro: travar ali transforma uma falha de query em
    // processo pendurado, que é estritamente pior do que o defeito original.
    const a = new Error('a');
    const b = new Error('b');
    (a as { cause?: unknown }).cause = b;
    (b as { cause?: unknown }).cause = a;

    assert.equal(readDriverError(a), null);
  });

  it('aceita errno em objeto simples, não só em instância de Error', () => {
    // mysql2 nem sempre entrega uma instância de Error através de fronteiras de serialização.
    const info = readDriverError({ cause: { errno: DEADLOCK, code: 'ER_LOCK_DEADLOCK' } });

    assert.equal(info?.errno, DEADLOCK);
  });
});

describe('isDeadlock / isLockWaitTimeout — a distinção que decide a correção', () => {
  it('reconhece deadlock (1213) e não o confunde com lock-wait', () => {
    const e = drizzleWrap('insert ...', mysqlError(DEADLOCK, 'ER_LOCK_DEADLOCK'));

    assert.equal(isDeadlock(e), true);
    assert.equal(isLockWaitTimeout(e), false);
  });

  it('reconhece lock-wait timeout (1205) e não o confunde com deadlock', () => {
    const e = drizzleWrap('insert ...', mysqlError(LOCK_WAIT, 'ER_LOCK_WAIT_TIMEOUT', 'HY000'));

    assert.equal(isLockWaitTimeout(e), true);
    assert.equal(isDeadlock(e), false);
  });

  it('erro sem driver não é nem um nem outro', () => {
    const e = new Error('qualquer outra coisa');

    assert.equal(isDeadlock(e), false);
    assert.equal(isLockWaitTimeout(e), false);
  });

  it('violação de constraint não é retentável — não pode passar por deadlock', () => {
    // 1062 = ER_DUP_ENTRY. Repetir isto não muda o desfecho: é defeito de dado, não corrida.
    const e = drizzleWrap('insert ...', mysqlError(1062, 'ER_DUP_ENTRY', '23000'));

    assert.equal(isDeadlock(e), false);
    assert.equal(isLockWaitTimeout(e), false);
  });
});

describe('describeDriverError — o que vai para o log', () => {
  it('nomeia errno e code, que é o que faltava no log da #803', () => {
    const e = drizzleWrap(
      'insert into `fin_retentions` ...',
      mysqlError(DEADLOCK, 'ER_LOCK_DEADLOCK'),
    );

    const line = describeDriverError(e);

    assert.match(line, /1213/);
    assert.match(line, /ER_LOCK_DEADLOCK/);
  });

  it('preserva a mensagem original — o diagnóstico soma, não substitui', () => {
    const e = drizzleWrap(
      'insert into `fin_retentions` ...',
      mysqlError(DEADLOCK, 'ER_LOCK_DEADLOCK'),
    );

    assert.match(describeDriverError(e), /Failed query/);
  });

  it('degrada para a mensagem quando não há driver na cadeia', () => {
    const line = describeDriverError(new Error('falha sem driver'));

    assert.match(line, /falha sem driver/);
  });

  it('NÃO publica sqlMessage — é o único campo que carrega dado da linha', () => {
    // `errno`/`code`/`sqlState` são literais do protocolo. `sqlMessage` não: em ER_DUP_ENTRY o
    // servidor devolve o VALOR duplicado — `Duplicate entry 'fulano@exemplo.com' for key …`.
    // Este helper é transversal e o próximo adapter a adotá-lo tem índice único sobre e-mail,
    // então incluir o campo publicaria PII em log a partir de um módulo de diagnóstico.
    const e = drizzleWrap('insert into `auth_user` ...', mysqlError(1062, 'ER_DUP_ENTRY', '23000'));
    Object.assign((e as { cause?: object }).cause ?? {}, {
      sqlMessage: "Duplicate entry 'fulano@exemplo.com' for key 'auth_user_email_idx'",
    });

    const line = describeDriverError(e);

    assert.equal(line.includes('fulano@exemplo.com'), false);
    assert.equal(line.includes('sqlMessage'), false);
    // …mas o diagnóstico continua útil: o errno e o code seguem lá.
    assert.match(line, /1062/);
    assert.match(line, /ER_DUP_ENTRY/);
  });

  it('erro de socket tem errno NEGATIVO e não é confundido com erro do servidor', () => {
    // `NodeJS.ErrnoException` também carrega `errno`. Os dois espaços numéricos convivem no
    // mesmo campo; o que garante a não-colisão é o sinal, não o tipo.
    const socketErr = new Error('read ECONNRESET');
    Object.assign(socketErr, { errno: -54, code: 'ECONNRESET' });
    const e = drizzleWrap('select 1', socketErr);

    assert.equal(isDeadlock(e), false);
    assert.equal(isLockWaitTimeout(e), false);
    assert.match(describeDriverError(e), /ECONNRESET/);
  });

  it('não quebra com entrada que não é Error', () => {
    assert.equal(typeof describeDriverError('string solta'), 'string');
    assert.equal(typeof describeDriverError(null), 'string');
  });
});

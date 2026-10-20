/**
 * #1071 (CA1/CA2) — qual `ER_DUP_ENTRY` do `save` de contrato é "número duplicado".
 *
 * O Drizzle lança `DrizzleQueryError` com a mensagem `Failed query: insert into ctr_contracts (…,
 * sequential_number, …)` e encadeia em `cause` o erro do mysql2, que é quem traz `errno`, `code` e a
 * `sqlMessage` com o NOME do índice violado. Só a violação de `ctr_contracts_sequential_number_unique`
 * vira `contract-repo-conflict`; PK do contrato, PK da outbox e qualquer outra chave seguem o caminho
 * genérico do repositório.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { DrizzleQueryError } from 'drizzle-orm';

import {
  createDrizzleContractRepository,
  isSequentialNumberDup,
} from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import * as schema from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';
import { buildContract } from '../fixtures.ts';

const { contracts } = schema;

// Forma do erro do mysql2 (`lib/packets/packet.js` → `Packet.prototype.asError`): `message` é a própria
// `sqlMessage`, mais `code`/`errno`/`sqlState`.
const mysql2Error = (errno: number, code: string, sqlMessage: string): Error =>
  Object.assign(new Error(sqlMessage), { code, errno, sqlState: '23000', sqlMessage });

const dup = (key: string, entry = 'x'): Error =>
  mysql2Error(1062, 'ER_DUP_ENTRY', `Duplicate entry '${entry}' for key '${key}'`);

// O SQL do INSERT cita `sequential_number` — é exatamente o que fazia toda violação casar.
const INSERT_SQL =
  'insert into `ctr_contracts` (`id`, `sequential_number`, `title`) values (?, ?, ?)';

const wrapped = (cause: Error): Error => new DrizzleQueryError(INSERT_SQL, [], cause);

describe('#1071 — isSequentialNumberDup', () => {
  it('o índice do schema é o mesmo nome da migration 0000', () => {
    assert.equal(contracts.sequentialNumber.uniqueName, 'ctr_contracts_sequential_number_unique');
  });

  it('CA1: PK do contrato (sob DrizzleQueryError cujo SQL cita sequential_number) → false', () => {
    const e = wrapped(dup('ctr_contracts.PRIMARY', 'e1071000-0000-4000-8000-000000000001'));
    assert.equal(isSequentialNumberDup(e), false);
  });

  it('CA1: PK da outbox na mesma transação → false', () => {
    const e = new DrizzleQueryError(
      'insert into `ctr_outbox` (`event_id`, `aggregate_id`) values (?, ?)',
      [],
      dup('ctr_outbox.PRIMARY', 'e1071000-0000-4000-8000-000000000002'),
    );
    assert.equal(isSequentialNumberDup(e), false);
  });

  it('CA1: outra falha que não é ER_DUP_ENTRY (lock wait) → false', () => {
    const e = wrapped(
      mysql2Error(
        1205,
        'ER_LOCK_WAIT_TIMEOUT',
        'Lock wait timeout exceeded; try restarting transaction',
      ),
    );
    assert.equal(isSequentialNumberDup(e), false);
  });

  it('CA1: o valor duplicado não decide — só o nome da chave', () => {
    // Um número digitado não pode se passar pelo índice: quem decide é o trecho `for key '…'`.
    const e = wrapped(dup('ctr_contracts.PRIMARY', 'ctr_contracts_sequential_number_unique'));
    assert.equal(isSequentialNumberDup(e), false);
  });

  it('CA2: índice de sequential_number (MySQL 8: `tabela.índice`) → true', () => {
    const e = wrapped(dup('ctr_contracts.ctr_contracts_sequential_number_unique', '0005/2026'));
    assert.equal(isSequentialNumberDup(e), true);
  });

  it('CA2: índice de sequential_number sem prefixo de tabela (MySQL < 8.0.19) → true', () => {
    const e = wrapped(dup('ctr_contracts_sequential_number_unique', '0005/2026'));
    assert.equal(isSequentialNumberDup(e), true);
  });

  it('CA2: erro do mysql2 sem o invólucro do Drizzle → true', () => {
    const e = dup('ctr_contracts.ctr_contracts_sequential_number_unique', '0005/2026');
    assert.equal(isSequentialNumberDup(e), true);
  });
});

// O mesmo critério visto pelo `save`: a transação lança, o repositório classifica. O handle é um
// duplo mínimo — só `transaction` é alcançado antes do erro.
describe('#1071 — save do repositório Drizzle diante de ER_DUP_ENTRY', () => {
  const repoThrowing = (cause: Error) =>
    createDrizzleContractRepository({
      db: { transaction: () => Promise.reject(cause) },
      schema,
      close: () => Promise.resolve(),
    } as unknown as MysqlHandle);

  it('CA1: PK do contrato → contract-repo-unavailable (não conflict)', async () => {
    const repo = repoThrowing(wrapped(dup('ctr_contracts.PRIMARY')));
    assert.deepEqual(await repo.save(buildContract(), []), {
      ok: false,
      error: 'contract-repo-unavailable',
    });
  });

  it('CA2: índice de sequential_number → contract-repo-conflict', async () => {
    const repo = repoThrowing(
      wrapped(dup('ctr_contracts.ctr_contracts_sequential_number_unique', '001/2026')),
    );
    assert.deepEqual(await repo.save(buildContract(), []), {
      ok: false,
      error: 'contract-repo-conflict',
    });
  });
});

import { describe, it, mock } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import * as schema from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { AmendmentRow } from '#src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts';
import { createDrizzleAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';

const AMENDMENT_ID = '22222222-2222-4222-8222-222222222222';
const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';

/** Aditivo `TermChange` pendente cujo `newEndDate` o mysql2 devolveu como `Date` inválido. */
const corruptTermChange = (): AmendmentRow => ({
  id: AMENDMENT_ID,
  contractId: CONTRACT_ID,
  amendmentNumber: 'AD 01-001/2026',
  description: 'Prorrogação',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  kind: 'TermChange',
  impactValueCents: null,
  newEndDate: new Date('invalid'),
  status: 'Pending',
  signedDocumentRef: null,
  signedAt: null,
  homologatedAt: null,
  homologatedBy: null,
});

const handleReturning = (rows: readonly AmendmentRow[]): MysqlHandle => {
  const builder: Record<string, unknown> = {};
  for (const step of ['from', 'where', 'orderBy']) builder[step] = () => builder;
  builder['then'] = (resolve: (v: readonly AmendmentRow[]) => unknown) => resolve(rows);
  return { db: { select: () => builder }, schema } as unknown as MysqlHandle;
};

/** Roda `fn` e devolve as linhas que ela escreveu no stderr. */
const stderrOf = async (fn: () => Promise<unknown>): Promise<readonly string[]> => {
  const stderr = mock.method(process.stderr, 'write', () => true);
  try {
    await fn();
    return stderr.mock.calls.map((c) => String(c.arguments[0]));
  } finally {
    stderr.mock.restore();
  }
};

const assertFullCause = (logs: readonly string[]): void => {
  const line = logs.join('');
  assert.match(line, /AmendmentMapperInvalidDate/);
  assert.match(line, /newEndDate/);
  assert.match(line, /plain-date-invalid-date/);
};

describe('amendment repo — o log leva o erro inteiro do mapper, não só a tag', () => {
  it('findById: o stderr cita tag, campo e causa', async () => {
    const id = AmendmentId.rehydrate(AMENDMENT_ID);
    assert.ok(id.ok);
    const repo = createDrizzleAmendmentRepository(handleReturning([corruptTermChange()]));
    let result: unknown;
    const logs = await stderrOf(async () => {
      result = await repo.findById(id.value);
    });
    assert.deepEqual(result, err('amendment-repo-unavailable'));
    assertFullCause(logs);
  });

  it('findByContractId: o stderr cita tag, campo e causa', async () => {
    const contractId = ContractId.rehydrate(CONTRACT_ID);
    assert.ok(contractId.ok);
    const repo = createDrizzleAmendmentRepository(handleReturning([corruptTermChange()]));
    const logs = await stderrOf(() => repo.findByContractId(contractId.value));
    assertFullCause(logs);
  });
});

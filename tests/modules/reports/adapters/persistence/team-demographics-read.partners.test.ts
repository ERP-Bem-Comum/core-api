import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import { TeamDemographicsReadFromPartners } from '#src/modules/reports/adapters/persistence/team-demographics-read.partners.ts';

describe('TeamDemographicsReadFromPartners — tradução de erro', () => {
  it('referência inválida segue como erro próprio, não como indisponibilidade de banco', async () => {
    const port = TeamDemographicsReadFromPartners(() =>
      Promise.resolve(err('team-demographics-invalid-reference-date')),
    );
    assert.deepEqual(await port.list(), err('team-demographics-invalid-reference-date'));
  });

  it('falha de leitura do partners vira team-demographics-read-unavailable', async () => {
    const port = TeamDemographicsReadFromPartners(() =>
      Promise.resolve(err('collaborator-demographics-read-failure')),
    );
    assert.deepEqual(await port.list(), err('team-demographics-read-unavailable'));
  });
});

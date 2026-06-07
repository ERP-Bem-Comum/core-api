/**
 * PARTNERS-EXPORT-PARITY-HTTP — W0 (RED) — serializer CSV de Atos (placeholder ADR-0036).
 *
 * RED por inexistência: `actsToCsv` (`act-csv.ts`) ainda não existe. Act é clone enxuto de
 * Collaborator — o CSV cobre só os campos do core do placeholder (sem os campos pessoais ricos).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { BOM, LINE_TERMINATOR } from '#src/shared/utils/csv.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import type { Act as ActType } from '#src/modules/partners/domain/act/types.ts';
import { actsToCsv } from '#src/modules/partners/adapters/export/act-csv.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const DEACTIVATED_AT = new Date('2026-06-02T15:30:00.000Z');

const EXPECTED_HEADER = [
  'id',
  'name',
  'email',
  'cpf',
  'occupationArea',
  'role',
  'startOfContract',
  'employmentRelationship',
  'registrationStatus',
  'status',
  'deactivatedAt',
].join(',');

const baseInput = () => ({
  id: ActId.generate(),
  name: 'Ato X',
  email: 'ato@org.org',
  cpf: '111.444.777-35',
  occupationArea: 'PARC',
  role: 'Voluntário',
  startOfContract: NOW,
  employmentRelationship: 'CLT',
  registeredAt: NOW,
});

const makeActive = (over: Partial<ReturnType<typeof baseInput>> = {}): ActType => {
  const r = Act.register({ ...baseInput(), ...over });
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.act;
};

// `Act.deactivate` retorna o agregado direto (não Result) — diferente de Supplier/Financier.
const makeInactive = (over: Partial<ReturnType<typeof baseInput>> = {}): ActType =>
  Act.deactivate(makeActive(over), DEACTIVATED_AT);

const dataLines = (csv: string): readonly string[] =>
  csv
    .split(LINE_TERMINATOR)
    .slice(1)
    .filter((l) => l.length > 0);

describe('actsToCsv — header e vazio', () => {
  it('lista vazia → BOM + header + CRLF', () => {
    assert.equal(actsToCsv([]), `${BOM}${EXPECTED_HEADER}${LINE_TERMINATOR}`);
  });
});

describe('actsToCsv — células', () => {
  it('Active: status=Active, deactivatedAt vazio, cpf normalizado', () => {
    const a = makeActive();
    const cells = dataLines(actsToCsv([a]))[0]?.split(',') ?? [];
    assert.equal(cells[3], String(a.cpf));
    assert.equal(cells[9], 'Active');
    assert.equal(cells[10], '');
  });

  it('Inactive: status=Inactive + deactivatedAt ISO', () => {
    const a = makeInactive();
    const cells = dataLines(actsToCsv([a]))[0]?.split(',') ?? [];
    assert.equal(cells[9], 'Inactive');
    assert.equal(cells[10], DEACTIVATED_AT.toISOString());
  });
});

describe('actsToCsv — anti CSV-injection', () => {
  it('nome iniciando com "@" é escapado', () => {
    const a = makeActive({ name: '@cmd' });
    const line = dataLines(actsToCsv([a]))[0] ?? '';
    assert.equal(/(^|,)@cmd/.test(line), false);
  });
});

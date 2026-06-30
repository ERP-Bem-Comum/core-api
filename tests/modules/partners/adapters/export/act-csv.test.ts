/**
 * Serializer CSV de Acordos de Cooperação Técnica (`act-csv.ts`). Cobre header, lista vazia,
 * células (Active/Inactive) e anti-CSV-injection. Espelha `supplier-csv.test.ts`.
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
  'actNumber',
  'name',
  'email',
  'cnpj',
  'corporateName',
  'fantasyName',
  'occupationArea',
  'legalRepresentative',
  'startDate',
  'endDate',
  'hasFinancialTransfer',
  'status',
  'deactivatedAt',
].join(',');

const baseInput = () => ({
  id: ActId.generate(),
  actNumber: 'ACT-2026-001',
  name: 'Acordo X',
  email: 'contato@org.org',
  cnpj: '11.222.333/0001-81',
  corporateName: 'Instituição Parceira LTDA',
  fantasyName: 'IP',
  occupationArea: 'PARC',
  legalRepresentative: 'João Diretor',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  hasFinancialTransfer: false,
  bankAccount: null,
  pixKey: null,
  registeredAt: NOW,
});

const makeActive = (over: Partial<ReturnType<typeof baseInput>> = {}): ActType => {
  const r = Act.register({ ...baseInput(), ...over });
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.act;
};

const makeInactive = (over: Partial<ReturnType<typeof baseInput>> = {}): ActType => {
  const d = Act.deactivate(makeActive(over), DEACTIVATED_AT);
  assert.ok(d.ok);
  if (!d.ok) throw new Error('fixture inactive');
  return d.value.act;
};

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
  it('Active: status=Active, deactivatedAt vazio, cnpj normalizado', () => {
    const a = makeActive();
    const cells = dataLines(actsToCsv([a]))[0]?.split(',') ?? [];
    assert.equal(cells[1], 'ACT-2026-001');
    assert.equal(cells[4], String(a.cnpj));
    assert.equal(cells[9], '2026-01-01');
    assert.equal(cells[10], '2026-12-31');
    assert.equal(cells[11], 'false');
    assert.equal(cells[12], 'Active');
    assert.equal(cells[13], '');
  });

  it('Inactive: status=Inactive + deactivatedAt ISO', () => {
    const a = makeInactive();
    const cells = dataLines(actsToCsv([a]))[0]?.split(',') ?? [];
    assert.equal(cells[12], 'Inactive');
    assert.equal(cells[13], DEACTIVATED_AT.toISOString());
  });
});

describe('actsToCsv — anti CSV-injection', () => {
  it('nome iniciando com "@" é escapado', () => {
    const a = makeActive({ name: '@cmd' });
    const line = dataLines(actsToCsv([a]))[0] ?? '';
    assert.equal(/(^|,)@cmd/.test(line), false);
  });
});

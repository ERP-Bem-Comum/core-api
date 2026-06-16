/**
 * PARTNERS-EXPORT-PARITY-HTTP — W0 (RED) — serializer CSV de Financiadores.
 *
 * RED por inexistência: `financiersToCsv` (`financier-csv.ts`) ainda não existe.
 * Espelha `supplier-csv.ts`/`collaborator-csv.ts` (BOM + header + CRLF + escape anti-injection via util).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { BOM, LINE_TERMINATOR } from '#src/shared/utils/csv.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import type { Financier as FinancierType } from '#src/modules/partners/domain/financier/types.ts';
import { financiersToCsv } from '#src/modules/partners/adapters/export/financier-csv.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const DEACTIVATED_AT = new Date('2026-06-02T15:30:00.000Z');

const EXPECTED_HEADER = [
  'id',
  'name',
  'corporateName',
  'legalRepresentative',
  'cnpj',
  'telephone',
  'address',
  'status',
  'deactivatedAt',
].join(',');

const baseInput = () => ({
  id: FinancierId.generate(),
  name: 'Financiador X',
  corporateName: 'Financiador X LTDA',
  legalRepresentative: 'Maria Souza',
  cnpj: '11.222.333/0001-81',
  telephone: '+5511999998888',
  address: 'Av Teste 100',
  bankAccount: null,
  pixKey: null,
  registeredAt: NOW,
});

const makeActive = (over: Partial<ReturnType<typeof baseInput>> = {}): FinancierType => {
  const r = Financier.register({ ...baseInput(), ...over });
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.financier;
};

const makeInactive = (over: Partial<ReturnType<typeof baseInput>> = {}): FinancierType => {
  const r = Financier.deactivate(makeActive(over), DEACTIVATED_AT);
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.financier;
};

const dataLines = (csv: string): readonly string[] =>
  csv
    .split(LINE_TERMINATOR)
    .slice(1)
    .filter((l) => l.length > 0);

describe('financiersToCsv — header e vazio', () => {
  it('lista vazia → BOM + header + CRLF (sem linhas de dados)', () => {
    assert.equal(financiersToCsv([]), `${BOM}${EXPECTED_HEADER}${LINE_TERMINATOR}`);
  });

  it('output sempre inicia com BOM + header', () => {
    assert.equal(financiersToCsv([makeActive()]).startsWith(`${BOM}${EXPECTED_HEADER}`), true);
  });
});

describe('financiersToCsv — células', () => {
  it('Active: status=Active, deactivatedAt vazio, cnpj normalizado', () => {
    const f = makeActive();
    const cells = dataLines(financiersToCsv([f]))[0]?.split(',') ?? [];
    assert.equal(cells[4], String(f.cnpj));
    assert.equal(cells[7], 'Active');
    assert.equal(cells[8], '');
  });

  it('Inactive: status=Inactive + deactivatedAt ISO', () => {
    const f = makeInactive();
    const cells = dataLines(financiersToCsv([f]))[0]?.split(',') ?? [];
    assert.equal(cells[7], 'Inactive');
    assert.equal(cells[8], DEACTIVATED_AT.toISOString());
  });
});

describe('financiersToCsv — anti CSV-injection', () => {
  it('nome iniciando com "=" é escapado (não inicia célula com fórmula ativa)', () => {
    const f = makeActive({ name: '=SUM(A1:A9)', corporateName: '=SUM(A1:A9) LTDA' });
    const line = dataLines(financiersToCsv([f]))[0] ?? '';
    // O util prefixa aspa simples / envolve em aspas — a célula NÃO começa com '='.
    assert.equal(/(^|,)=SUM/.test(line), false);
  });
});

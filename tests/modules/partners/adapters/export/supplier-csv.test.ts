import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { BOM, LINE_TERMINATOR } from '#src/shared/utils/csv.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import type { Supplier as SupplierType } from '#src/modules/partners/domain/supplier/types.ts';
import { suppliersToCsv } from '#src/modules/partners/adapters/export/supplier-csv.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const DEACTIVATED_AT = new Date('2026-06-02T15:30:00.000Z');

const EXPECTED_HEADER = [
  'id',
  'name',
  'email',
  'cnpj',
  'corporateName',
  'fantasyName',
  'serviceCategory',
  'status',
  'bankAccountBank',
  'bankAccountAgency',
  'bankAccountNumber',
  'bankAccountCheckDigit',
  'pixKeyType',
  'pixKey',
  'deactivatedAt',
].join(',');

const bankInput = () => ({
  bank: '001',
  agency: '0001-2',
  accountNumber: '123456',
  checkDigit: '7',
});
const pixInput = () => ({ keyType: 'email', key: 'contato@fornecedor.com.br' });

const baseInput = () => ({
  id: SupplierId.generate(),
  name: 'Fornecedor X',
  email: 'contato@fornecedor.com.br',
  cnpj: '11.222.333/0001-81',
  corporateName: 'Fornecedor X LTDA',
  fantasyName: 'FX',
  serviceCategory: 'INFORMATICA',
  bankAccount: bankInput() as ReturnType<typeof bankInput> | null,
  pixKey: null as ReturnType<typeof pixInput> | null,
  registeredAt: NOW,
});

const makeActive = (over: Partial<ReturnType<typeof baseInput>> = {}): SupplierType => {
  const r = Supplier.register({ ...baseInput(), ...over });
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.supplier;
};

const makeInactive = (over: Partial<ReturnType<typeof baseInput>> = {}): SupplierType => {
  const r = Supplier.deactivate(makeActive(over), DEACTIVATED_AT);
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.supplier;
};

// Linhas de dados: split por CRLF descarta header (idx 0) e o '' final (terminador).
const dataLines = (csv: string): readonly string[] =>
  csv
    .split(LINE_TERMINATOR)
    .slice(1)
    .filter((l) => l.length > 0);

describe('suppliersToCsv — header e vazio', () => {
  it('lista vazia → BOM + header + CRLF (sem linhas de dados)', () => {
    assert.equal(suppliersToCsv([]), `${BOM}${EXPECTED_HEADER}${LINE_TERMINATOR}`);
  });

  it('output sempre inicia com BOM + header', () => {
    const out = suppliersToCsv([makeActive()]);
    assert.equal(out.startsWith(`${BOM}${EXPECTED_HEADER}${LINE_TERMINATOR}`), true);
  });

  it('cada linha termina em CRLF', () => {
    const out = suppliersToCsv([makeActive(), makeInactive()]);
    assert.equal(out.endsWith(LINE_TERMINATOR), true);
  });
});

describe('suppliersToCsv — Active com bankAccount', () => {
  it('preenche as 4 colunas bancárias e deixa pix/deactivatedAt vazias', () => {
    const s = makeActive({ bankAccount: bankInput(), pixKey: null });
    const cells = dataLines(suppliersToCsv([s]))[0]?.split(',') ?? [];
    assert.equal(cells[7], 'Active');
    assert.equal(cells[8], '001'); // bankAccountBank
    assert.equal(cells[9], '0001-2'); // bankAccountAgency
    assert.equal(cells[10], '123456'); // bankAccountNumber
    assert.equal(cells[11], '7'); // bankAccountCheckDigit
    assert.equal(cells[12], ''); // pixKeyType
    assert.equal(cells[13], ''); // pixKey
    assert.equal(cells[14], ''); // deactivatedAt
  });

  it('cnpj é o valor normalizado do VO', () => {
    const s = makeActive();
    const cells = dataLines(suppliersToCsv([s]))[0]?.split(',') ?? [];
    assert.equal(cells[3], String(s.cnpj));
  });
});

describe('suppliersToCsv — Active com pixKey', () => {
  it('preenche pixKeyType/pixKey e deixa colunas bancárias vazias', () => {
    const s = makeActive({ bankAccount: null, pixKey: pixInput() });
    const cells = dataLines(suppliersToCsv([s]))[0]?.split(',') ?? [];
    assert.equal(cells[8], '');
    assert.equal(cells[9], '');
    assert.equal(cells[10], '');
    assert.equal(cells[11], '');
    assert.equal(cells[12], 'email'); // pixKeyType
    assert.equal(cells[13], 'contato@fornecedor.com.br'); // pixKey
    assert.equal(cells[14], '');
  });
});

describe('suppliersToCsv — Inactive', () => {
  it('status=Inactive e deactivatedAt em ISO 8601', () => {
    const s = makeInactive();
    const cells = dataLines(suppliersToCsv([s]))[0]?.split(',') ?? [];
    assert.equal(cells[7], 'Inactive');
    assert.equal(cells[14], DEACTIVATED_AT.toISOString());
  });
});

describe('suppliersToCsv — projeção alimenta o escape do util', () => {
  it('nome com vírgula sai citado (RFC 4180 herdado do util)', () => {
    const s = makeActive({ name: 'Alpha, Beta LTDA' });
    assert.equal(suppliersToCsv([s]).includes('"Alpha, Beta LTDA"'), true);
  });

  it('nome iniciando em = recebe prefixo anti-fórmula', () => {
    const s = makeActive({ name: '=cmd()' });
    assert.equal(suppliersToCsv([s]).includes("'=cmd()"), true);
  });
});

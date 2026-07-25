/**
 * FIN-DOC-PARSE-ONLY — W0 (RED) — #580: leitura pura (parse-only). Roda o MESMO leitor da ingestão e
 * devolve os campos extraídos + `supplierRef` casado por CNPJ, SEM criar rascunho nem persistir.
 * O use case não tem repo/storage → a ausência de efeito é estrutural (não há o que persistir).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err, type Result } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import type { DocumentReaderPort } from '#src/modules/financial/application/ports/document-reader.ts';
import type { DocumentReaderResult } from '#src/modules/financial/domain/document-reader/types.ts';
import type { DocumentReaderError } from '#src/modules/financial/domain/document-reader/errors.ts';
import { parseDocument } from '#src/modules/financial/application/use-cases/parse-document.ts';

const must = <T>(r: Result<T, unknown>): T => {
  if (!r.ok) throw new Error('test setup');
  return r.value;
};

const READ_RESULT: DocumentReaderResult = {
  resolvedVia: 'xml',
  type: 'NFS-e',
  documentNumber: '2024-0537',
  issueDate: new Date('2026-04-28T00:00:00.000Z'),
  supplier: { legalName: 'RAZAO SOCIAL LTDA', taxId: '12345678000199' },
  grossValue: must(Money.fromCents(100000)),
  description: 'Serviço de consultoria',
};

const readerReturning = (
  value: Result<DocumentReaderResult, DocumentReaderError>,
): DocumentReaderPort => ({
  read: () => Promise.resolve(value),
});

describe('financial/application/use-cases/parse-document (#580)', () => {
  it('CA1: extrai campos + casa supplierRef pelo CNPJ do emitente', async () => {
    const r = await parseDocument({
      reader: readerReturning(ok(READ_RESULT)),
      resolveSupplierByCnpj: (taxId) =>
        Promise.resolve(ok(taxId === '12345678000199' ? 'supplier-id-1' : null)),
    })({ bytes: new Uint8Array([0x3c]), mimeType: 'text/xml' });

    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplierRef, 'supplier-id-1');
    assert.equal(r.value.supplier?.taxId, '12345678000199');
    assert.equal(r.value.result?.type, 'NFS-e');
    assert.equal(r.value.result?.documentNumber, '2024-0537');
    assert.equal(r.value.resolvedVia, 'xml');
  });

  it('CA2: sem match cadastral → supplierRef null, mas supplier lido presente', async () => {
    const r = await parseDocument({
      reader: readerReturning(ok(READ_RESULT)),
      resolveSupplierByCnpj: () => Promise.resolve(ok(null)),
    })({ bytes: new Uint8Array([0x3c]), mimeType: 'text/xml' });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.supplierRef, null);
    assert.equal(r.value.supplier?.taxId, '12345678000199');
  });

  it('CA3: erro de RECURSO (vazio/grande) → err (não devolve campos)', async () => {
    const r = await parseDocument({ reader: readerReturning(err('empty-input')) })({
      bytes: new Uint8Array(),
      mimeType: 'text/xml',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'empty-input');
  });

  it('CA4: erro de LEITURA (malformed) → ok com campos null (front não preenche)', async () => {
    const r = await parseDocument({ reader: readerReturning(err('malformed-document')) })({
      bytes: new Uint8Array([0x3c]),
      mimeType: 'text/xml',
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.result, null);
    assert.equal(r.value.supplierRef, null);
  });
});

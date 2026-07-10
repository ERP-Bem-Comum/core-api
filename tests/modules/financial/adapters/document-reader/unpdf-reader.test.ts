import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createUnpdfDocumentReader } from '#src/modules/financial/adapters/document-reader/unpdf-reader.ts';
import { buildNativePdf } from './_fixtures/pdf-builder.ts';

describe('financial/adapters/document-reader/unpdf-reader', () => {
  it('#396: extrai texto via unpdf e estrutura os campos (resolvedVia=unpdf)', async () => {
    const reader = createUnpdfDocumentReader();
    const bytes = buildNativePdf([
      'PREFEITURA - NOTA FISCAL DE SERVICOS ELETRONICA NFS-e',
      'Numero da Nota: 0000000123456',
      'Valor Total dos Servicos: R$ 1.234,56',
    ]);
    const r = await reader.read({ bytes });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.resolvedVia, 'unpdf');
    assert.equal(r.value.type, 'NFS-e');
    assert.equal(r.value.grossValue?.cents, 123456);
  });

  it('#396/F2: Prestador seguido de mais campos (unpdf colapsa \\n) → legalName BOUNDED (não engole o doc)', async () => {
    const reader = createUnpdfDocumentReader();
    const bytes = buildNativePdf([
      'NOTA FISCAL DE SERVICOS ELETRONICA NFS-e',
      'Prestador: ACME SERVICOS LTDA',
      'CNPJ: 12345678000199',
      'Valor Total dos Servicos: R$ 1.234,56',
    ]);
    const r = await reader.read({ bytes });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    // Sem o terminador `[^:\n]+`, o `.+` engoliria "ACME ... CNPJ:... Valor Total:..." (unpdf remove \n).
    assert.ok(
      (r.value.supplier?.legalName?.length ?? 0) < 60,
      `legalName vazou: ${r.value.supplier?.legalName ?? '(vazio)'}`,
    );
  });

  it('#396: bytes vazios → err(empty-input)', async () => {
    const reader = createUnpdfDocumentReader();
    const r = await reader.read({ bytes: new Uint8Array([]) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'empty-input');
  });

  it('#396: lixo não-PDF → err (não vaza exceção do pdf.js pela borda do port)', async () => {
    const reader = createUnpdfDocumentReader();
    const r = await reader.read({ bytes: new Uint8Array([0, 1, 2, 3, 4, 5]) });
    assert.equal(r.ok, false);
  });
});

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED: a factory de composição ainda não existe (value import → ERR_MODULE_NOT_FOUND).
import { createDocumentReader } from '#src/modules/financial/adapters/document-reader/create-document-reader.ts';
import { NFSE_NACIONAL, XXE_ATTACK } from './_fixtures/xml-fixtures.ts';
import { NFSE_NATIVE, IMAGE_ONLY_PDF, BOMB_PDF } from './_fixtures/pdf-fixtures.ts';

// Integração ponta-a-ponta: os 3 readers REAIS (XML + nativo) montados na cascata (ADR-0050).
describe('financial/adapters/document-reader/create-document-reader (integração)', () => {
  it('CA1: XML de NFS-e → resolve por XML (resolvedVia=xml)', async () => {
    const reader = createDocumentReader();
    const r = await reader.read({ bytes: NFSE_NACIONAL.bytes() });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.resolvedVia, 'xml');
    assert.equal(r.value.documentNumber, NFSE_NACIONAL.expected.documentNumber);
    assert.equal(r.value.grossValue?.cents, NFSE_NACIONAL.expected.grossValueCents);
  });

  it('CA2/CA3: PDF nativo de NFS-e → XML falha e a cascata resolve por nativo (resolvedVia=native-text)', async () => {
    const reader = createDocumentReader();
    const r = await reader.read({ bytes: NFSE_NATIVE.bytes() });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    // resolvedVia='native-text' prova a precedência: só chegou ao nativo porque o XML não reconheceu.
    assert.equal(r.value.resolvedVia, 'native-text');
    assert.equal(r.value.documentNumber, NFSE_NATIVE.expected.documentNumber);
    assert.equal(r.value.grossValue?.cents, NFSE_NATIVE.expected.grossValueCents);
  });

  it('CA4: PDF escaneado (só imagem) → err(scanned-unsupported)', async () => {
    const reader = createDocumentReader();
    const r = await reader.read({ bytes: IMAGE_ONLY_PDF.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'scanned-unsupported');
  });

  it('CA5: bomba (PDF) → err(decompression-limit-exceeded) propagado pela cascata', async () => {
    const reader = createDocumentReader();
    const r = await reader.read({ bytes: BOMB_PDF.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'decompression-limit-exceeded');
  });

  it('CA5: XXE (XML com DOCTYPE) → rejeitado, sem vazar conteúdo de arquivo', async () => {
    const reader = createDocumentReader();
    const r = await reader.read({ bytes: XXE_ATTACK.bytes() });
    // XML rejeita DOCTYPE → cascata cai ao nativo (não é PDF) → erro; nada de /etc/passwd no resultado.
    assert.equal(r.ok, false);
  });
});

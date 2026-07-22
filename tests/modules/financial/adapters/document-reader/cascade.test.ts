import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/index.ts';
import { createCascadeReader } from '#src/modules/financial/adapters/document-reader/cascade.ts';
import type { DocumentReaderPort } from '#src/modules/financial/application/ports/document-reader.ts';
import type { DocumentReaderResult } from '#src/modules/financial/domain/document-reader/types.ts';
import type { DocumentReaderError } from '#src/modules/financial/domain/document-reader/errors.ts';

// Reader fake que SEMPRE resolve com o resultado dado.
const resolving = (result: DocumentReaderResult): DocumentReaderPort => ({
  read: () => Promise.resolve(ok(result)),
});
// Reader fake que NUNCA resolve (devolve erro → cascata cai para o próximo).
const failing = (error: DocumentReaderError): DocumentReaderPort => ({
  read: () => Promise.resolve(err(error)),
});
// Fallback padrão que nunca resolve (para os testes que não exercitam o degrau unpdf).
const noFallback = failing('scanned-unsupported');

const BYTES = { bytes: new Uint8Array([1, 2, 3]) };

describe('financial/adapters/document-reader/cascade', () => {
  it('CA4: XML resolve → resolvedVia="xml" mesmo quando o nativo também resolveria (precedência XML>nativo)', async () => {
    const xml = resolving({ resolvedVia: 'xml', type: 'NFS-e', documentNumber: '1' });
    const native = resolving({ resolvedVia: 'native-text', type: 'DANFE', documentNumber: '2' });
    const cascade = createCascadeReader({ xml, native, fallback: noFallback });
    const r = await cascade.read(BYTES);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.resolvedVia, 'xml');
      assert.equal(r.value.documentNumber, '1');
    }
  });

  it('CA4: quando o XML resolve, o reader nativo não é consultado (short-circuit)', async () => {
    let nativeCalls = 0;
    const xml = resolving({ resolvedVia: 'xml', type: 'NFS-e', documentNumber: '1' });
    const native: DocumentReaderPort = {
      read: () => {
        nativeCalls += 1;
        return Promise.resolve(ok({ resolvedVia: 'native-text' }));
      },
    };
    const cascade = createCascadeReader({ xml, native, fallback: noFallback });
    await cascade.read(BYTES);
    assert.equal(nativeCalls, 0);
  });

  it('CA4: XML falha, nativo resolve COM campos → resolvedVia="native-text"', async () => {
    const xml = failing('unsupported-pdf-structure');
    const native = resolving({ resolvedVia: 'native-text', type: 'DANFE', documentNumber: '77' });
    const cascade = createCascadeReader({ xml, native, fallback: noFallback });
    const r = await cascade.read(BYTES);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.resolvedVia, 'native-text');
      assert.equal(r.value.documentNumber, '77');
    }
  });

  it('CA4: nenhum reader resolve → err("scanned-unsupported")', async () => {
    const xml = failing('unsupported-pdf-structure');
    const native = failing('unsupported-pdf-structure');
    const cascade = createCascadeReader({ xml, native, fallback: noFallback });
    const r = await cascade.read(BYTES);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'scanned-unsupported');
  });

  it('F4: XML rejeita por source-too-large → terminal (nativo NÃO é consultado)', async () => {
    let nativeCalls = 0;
    const xml = failing('source-too-large');
    const native: DocumentReaderPort = {
      read: () => {
        nativeCalls += 1;
        return Promise.resolve(ok({ resolvedVia: 'native-text' }));
      },
    };
    const cascade = createCascadeReader({ xml, native, fallback: noFallback });
    const r = await cascade.read(BYTES);
    assert.equal(nativeCalls, 0);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'source-too-large');
  });

  it('F5: erro de recurso do nativo (decompression-limit-exceeded) é propagado, não mascarado', async () => {
    const xml = failing('malformed-document');
    const native = failing('decompression-limit-exceeded');
    const cascade = createCascadeReader({ xml, native, fallback: noFallback });
    const r = await cascade.read(BYTES);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'decompression-limit-exceeded');
  });

  // --- #396: degrau fallback (unpdf) ------------------------------------------------

  it('#396: nativo CLASSIFICA mas SEM campos (tabular) → fallback é consultado e vence', async () => {
    const xml = failing('malformed-document');
    const native = resolving({ resolvedVia: 'native-text', type: 'NFS-e' }); // só type, sem campos
    const fallback = resolving({ resolvedVia: 'unpdf', type: 'NFS-e', documentNumber: '99' });
    const cascade = createCascadeReader({ xml, native, fallback });
    const r = await cascade.read(BYTES);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.resolvedVia, 'unpdf');
      assert.equal(r.value.documentNumber, '99');
    }
  });

  it('#396: nativo classifica COM campos → fallback NÃO é consultado (short-circuit da métrica)', async () => {
    let fbCalls = 0;
    const xml = failing('malformed-document');
    const native = resolving({ resolvedVia: 'native-text', type: 'NFS-e', documentNumber: '5' });
    const fallback: DocumentReaderPort = {
      read: () => {
        fbCalls += 1;
        return Promise.resolve(ok({ resolvedVia: 'unpdf' }));
      },
    };
    const cascade = createCascadeReader({ xml, native, fallback });
    await cascade.read(BYTES);
    assert.equal(fbCalls, 0);
  });

  it('#396: nativo sem campos E fallback falha → devolve o nativo (classificação > nada)', async () => {
    const xml = failing('malformed-document');
    const native = resolving({ resolvedVia: 'native-text', type: 'NFS-e' });
    const fallback = failing('scanned-unsupported');
    const cascade = createCascadeReader({ xml, native, fallback });
    const r = await cascade.read(BYTES);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.resolvedVia, 'native-text');
  });

  it('#396: recurso do nativo é terminal → fallback NÃO é consultado', async () => {
    let fbCalls = 0;
    const xml = failing('malformed-document');
    const native = failing('source-too-large');
    const fallback: DocumentReaderPort = {
      read: () => {
        fbCalls += 1;
        return Promise.resolve(ok({ resolvedVia: 'unpdf' }));
      },
    };
    const cascade = createCascadeReader({ xml, native, fallback });
    const r = await cascade.read(BYTES);
    assert.equal(fbCalls, 0);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'source-too-large');
  });
});

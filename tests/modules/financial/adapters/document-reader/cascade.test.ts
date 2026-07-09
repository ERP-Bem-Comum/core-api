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

const BYTES = { bytes: new Uint8Array([1, 2, 3]) };

describe('financial/adapters/document-reader/cascade', () => {
  it('CA4: XML resolve → resolvedVia="xml" mesmo quando o nativo também resolveria (precedência XML>nativo)', async () => {
    // Arrange — ambos resolvem; a precedência decide.
    const xml = resolving({ resolvedVia: 'xml', type: 'NFS-e', documentNumber: '1' });
    const native = resolving({ resolvedVia: 'native-text', type: 'DANFE', documentNumber: '2' });
    const cascade = createCascadeReader({ xml, native });
    // Act
    const r = await cascade.read(BYTES);
    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.resolvedVia, 'xml');
      assert.equal(r.value.documentNumber, '1');
    }
  });

  it('CA4: quando o XML resolve, o reader nativo não é consultado (short-circuit)', async () => {
    // Arrange
    let nativeCalls = 0;
    const xml = resolving({ resolvedVia: 'xml', type: 'NFS-e' });
    const native: DocumentReaderPort = {
      read: () => {
        nativeCalls += 1;
        return Promise.resolve(ok({ resolvedVia: 'native-text' }));
      },
    };
    const cascade = createCascadeReader({ xml, native });
    // Act
    await cascade.read(BYTES);
    // Assert
    assert.equal(nativeCalls, 0);
  });

  it('CA4: XML falha, nativo resolve → resolvedVia="native-text"', async () => {
    // Arrange
    const xml = failing('unsupported-pdf-structure');
    const native = resolving({ resolvedVia: 'native-text', type: 'DANFE', documentNumber: '77' });
    const cascade = createCascadeReader({ xml, native });
    // Act
    const r = await cascade.read(BYTES);
    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.resolvedVia, 'native-text');
      assert.equal(r.value.documentNumber, '77');
    }
  });

  it('CA4: nenhum reader resolve → err("scanned-unsupported")', async () => {
    // Arrange
    const xml = failing('unsupported-pdf-structure');
    const native = failing('unsupported-pdf-structure');
    const cascade = createCascadeReader({ xml, native });
    // Act
    const r = await cascade.read(BYTES);
    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'scanned-unsupported');
    }
  });

  it('F4: XML rejeita por source-too-large → terminal (nativo NÃO é consultado)', async () => {
    // Arrange
    let nativeCalls = 0;
    const xml = failing('source-too-large');
    const native: DocumentReaderPort = {
      read: () => {
        nativeCalls += 1;
        return Promise.resolve(ok({ resolvedVia: 'native-text' }));
      },
    };
    const cascade = createCascadeReader({ xml, native });
    // Act
    const r = await cascade.read(BYTES);
    // Assert — erro de recurso é terminal; não empurra os bytes gigantes ao nativo.
    assert.equal(nativeCalls, 0);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'source-too-large');
  });

  it('F5: erro de recurso do nativo (decompression-limit-exceeded) é propagado, não mascarado', async () => {
    // Arrange
    const xml = failing('malformed-document');
    const native = failing('decompression-limit-exceeded');
    const cascade = createCascadeReader({ xml, native });
    // Act
    const r = await cascade.read(BYTES);
    // Assert — preserva o sinal de bomba (telemetria), não vira scanned-unsupported.
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'decompression-limit-exceeded');
  });
});

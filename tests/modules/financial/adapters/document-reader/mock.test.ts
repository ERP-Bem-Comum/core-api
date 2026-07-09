import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { createMockDocumentReader } from '#src/modules/financial/adapters/document-reader/mock.ts';
import type {
  DocumentReaderPort,
  DocumentReaderInput,
} from '#src/modules/financial/application/ports/document-reader.ts';
import type { DocumentReaderResult } from '#src/modules/financial/domain/document-reader/types.ts';
import type { DocumentReaderError } from '#src/modules/financial/domain/document-reader/errors.ts';

const must = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) throw new Error(`esperava ok, veio err: ${JSON.stringify(r.error)}`);
  return r.value;
};

// Critérios em .claude/.pipeline/FIN-DOC-READER-PORT/000-request.md (CA1, CA3).
const SEED_RESULT: DocumentReaderResult = {
  resolvedVia: 'xml',
  type: 'NFS-e',
  documentNumber: '2024-0537',
  supplier: { legalName: 'FORNECEDOR X LTDA', taxId: '12345678000199' },
  grossValue: must(Money.fromCents(84500)),
};

const INPUT: DocumentReaderInput = { bytes: new Uint8Array([1, 2, 3]) };

describe('financial/adapters/document-reader/mock', () => {
  it('CA3: semeado com { result } → read() devolve ok(result)', async () => {
    // Arrange
    const reader: DocumentReaderPort = createMockDocumentReader({ result: SEED_RESULT });
    // Act
    const r = await reader.read(INPUT);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.deepEqual(r.value, SEED_RESULT);
    }
  });

  it('CA3: semeado com { error } → read() devolve err(error)', async () => {
    // Arrange
    const error: DocumentReaderError = 'scanned-unsupported';
    const reader: DocumentReaderPort = createMockDocumentReader({ error });
    // Act
    const r = await reader.read({ bytes: new Uint8Array([9]) });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error, 'scanned-unsupported');
    }
  });

  it('CA3: é determinístico — a mesma seed devolve o mesmo Result em chamadas repetidas', async () => {
    // Arrange
    const reader: DocumentReaderPort = createMockDocumentReader({ result: SEED_RESULT });
    // Act
    const first = await reader.read({ bytes: new Uint8Array([1]) });
    const second = await reader.read({
      bytes: new Uint8Array([2]),
      declaredMime: 'application/xml',
    });
    // Assert — ignora o input; o resultado é função só da seed.
    assert.deepEqual(first, second);
  });
});

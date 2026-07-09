import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Result } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Competencia from '#src/modules/financial/domain/document/competencia.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
// `DOCUMENT_READER_ERRORS` é o witness de RUNTIME do union (tupla `as const` da qual
// `DocumentReaderError` deriva) — é o value import que garante o RED via `pnpm test`,
// já que `import type` sozinho é removido pelo strip-types e não falharia em runtime.
import { DOCUMENT_READER_ERRORS } from '#src/modules/financial/domain/document-reader/errors.ts';
import type { DocumentReaderResult } from '#src/modules/financial/domain/document-reader/types.ts';
import type { DocumentReaderError } from '#src/modules/financial/domain/document-reader/errors.ts';

// Desembrulha um Result em teste (testing.md relaxa `throw`): monta os VOs canônicos.
const must = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) throw new Error(`esperava ok, veio err: ${JSON.stringify(r.error)}`);
  return r.value;
};

// Critérios em .claude/.pipeline/FIN-DOC-READER-PORT/000-request.md (CA1, CA2).
// Campos PERMITIDOS no resultado (EN) — minimização LGPD: nenhum campo de texto bruto.
const ALLOWED_KEYS = new Set<string>([
  'resolvedVia',
  'type',
  'documentNumber',
  'competence',
  'issueDate',
  'supplier',
  'grossValue',
  'retentions',
]);

// Guard bidirecional de tipo: força o union de erros a ser EXATAMENTE estes 6 membros.
// Se W1 adicionar/renomear/remover um membro, o typecheck (W3) quebra aqui.
type _ExpectedErrors =
  | 'scanned-unsupported'
  | 'unsupported-pdf-structure'
  | 'decompression-limit-exceeded'
  | 'source-too-large'
  | 'empty-input'
  | 'malformed-document';
type _AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const errorUnionIsExact: _AssertEqual<DocumentReaderError, _ExpectedErrors> = true;

describe('financial/domain/document-reader/types', () => {
  it('CA2: um DocumentReaderResult completo só carrega campos permitidos + resolvedVia (sem texto bruto)', () => {
    // Arrange — valores monetários e compet./retenção via VOs canônicos (Money/Competencia/Retention).
    const full: DocumentReaderResult = {
      resolvedVia: 'xml',
      type: 'NFS-e',
      documentNumber: '2024-0537',
      competence: must(Competencia.fromString('2024-05')),
      issueDate: new Date('2024-05-18T00:00:00.000Z'),
      supplier: { legalName: 'FORNECEDOR X LTDA', taxId: '12345678000199' },
      grossValue: must(Money.fromCents(84500)),
      retentions: [
        must(Retention.create({ type: 'ISS', baseCents: 84500, rateBps: 500, valueCents: 4225 })),
      ],
    };
    // Act
    const keys = Object.keys(full);
    // Assert — todo campo presente pertence ao conjunto permitido…
    for (const k of keys) {
      assert.equal(ALLOWED_KEYS.has(k), true, `campo inesperado no resultado: ${k}`);
    }
    // …e não há vazamento de texto bruto do documento.
    assert.equal('text' in full, false);
    assert.equal('rawText' in full, false);
    assert.equal('conteudo' in full, false);
  });

  it('CA2: resolvedVia é a tag de proveniência "xml" | "native-text"', () => {
    // Arrange / Act
    const viaXml: DocumentReaderResult = { resolvedVia: 'xml' };
    const viaNative: DocumentReaderResult = { resolvedVia: 'native-text' };
    // Assert
    assert.equal(viaXml.resolvedVia, 'xml');
    assert.equal(viaNative.resolvedVia, 'native-text');
  });

  it('CA1/CA2: o mínimo válido é só resolvedVia — os demais campos são opcionais', () => {
    // Arrange / Act
    const minimal: DocumentReaderResult = { resolvedVia: 'native-text' };
    // Assert
    assert.equal(Object.keys(minimal).length, 1);
    assert.equal(minimal.resolvedVia, 'native-text');
  });

  it('CA2: o union de erros é exatamente os 6 membros kebab EN esperados', () => {
    // Arrange — witness de runtime exportado pelo domínio.
    const expected: readonly DocumentReaderError[] = [
      'scanned-unsupported',
      'unsupported-pdf-structure',
      'decompression-limit-exceeded',
      'source-too-large',
      'empty-input',
      'malformed-document',
    ];
    // Assert — a tupla canônica bate exatamente com o esperado (sem faltar/sobrar)…
    assert.equal(new Set(DOCUMENT_READER_ERRORS).size, 6);
    assert.deepEqual(new Set(DOCUMENT_READER_ERRORS), new Set(expected));
    // …e o guard de tipo bidirecional trava o union no typecheck (W3).
    assert.equal(errorUnionIsExact, true);
  });
});

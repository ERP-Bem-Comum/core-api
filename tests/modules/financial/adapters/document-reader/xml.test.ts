import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  createXmlDocumentReader,
  MAX_BYTES,
} from '#src/modules/financial/adapters/document-reader/xml.ts';
import {
  NFSE_NACIONAL,
  NFE,
  NFSE_LATIN1,
  XXE_ATTACK,
  EMPTY_INPUT,
  MALFORMED_XML,
  UNKNOWN_XML,
  BILLION_LAUGHS,
} from './_fixtures/xml-fixtures.ts';

// Campos permitidos no resultado (EN) — minimização LGPD, espelha o contrato do port.
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

describe('financial/adapters/document-reader/xml', () => {
  it('CA1: NFS-e Nacional → extrai campos + ISS retido para os VOs canônicos (resolvedVia=xml)', async () => {
    // Arrange
    const reader = createXmlDocumentReader();
    const exp = NFSE_NACIONAL.expected;
    // Act
    const r = await reader.read({ bytes: NFSE_NACIONAL.bytes() });
    // Assert
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const res = r.value;
    assert.equal(res.resolvedVia, 'xml');
    assert.equal(res.type, exp.type);
    assert.equal(res.documentNumber, exp.documentNumber);
    assert.equal(res.supplier?.legalName, exp.legalName);
    assert.equal(res.supplier?.taxId, exp.taxId);
    assert.equal(res.grossValue?.cents, exp.grossValueCents);
    assert.equal(res.competence?.year, exp.competence?.year);
    assert.equal(res.competence?.month, exp.competence?.month);
    assert.equal(res.issueDate?.getTime(), new Date(exp.issueDateIso).getTime());
    // ISS retido: type + base + alíquota (bps) + valor, todos como VO Retention.
    const iss = res.retentions?.[0];
    assert.equal(iss?.type, 'ISS');
    assert.equal(iss?.base.cents, 100000);
    assert.equal(iss?.rateBps, 500);
    assert.equal(iss?.value.cents, 5000);
  });

  it('CA2: NF-e 4.00 → type=DANFE + campos estruturados (path-aware)', async () => {
    // Arrange
    const reader = createXmlDocumentReader();
    const exp = NFE.expected;
    // Act
    const r = await reader.read({ bytes: NFE.bytes() });
    // Assert
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const res = r.value;
    assert.equal(res.resolvedVia, 'xml');
    assert.equal(res.type, 'DANFE');
    assert.equal(res.documentNumber, exp.documentNumber);
    assert.equal(res.supplier?.legalName, exp.legalName);
    assert.equal(res.supplier?.taxId, exp.taxId);
    assert.equal(res.grossValue?.cents, exp.grossValueCents);
    assert.equal(res.issueDate?.getTime(), new Date(exp.issueDateIso).getTime());
  });

  it('CA3: bytes vazios → err(empty-input)', async () => {
    const reader = createXmlDocumentReader();
    const r = await reader.read({ bytes: EMPTY_INPUT.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'empty-input');
  });

  it('CA3: XML sintaticamente inválido → err(malformed-document)', async () => {
    const reader = createXmlDocumentReader();
    const r = await reader.read({ bytes: MALFORMED_XML.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'malformed-document');
  });

  it('CA3: XML válido sem schema fiscal reconhecível → err(malformed-document) (cascata cai p/ nativo)', async () => {
    const reader = createXmlDocumentReader();
    const r = await reader.read({ bytes: UNKNOWN_XML.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'malformed-document');
  });

  it('CA4: encoding ISO-8859-1 declarado → razão social acentuada sem garbling', async () => {
    const reader = createXmlDocumentReader();
    const r = await reader.read({ bytes: NFSE_LATIN1.bytes() });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.supplier?.legalName, NFSE_LATIN1.expectedLegalName);
  });

  it('CA5: minimização — resultado só carrega campos permitidos (sem texto bruto)', async () => {
    const reader = createXmlDocumentReader();
    const r = await reader.read({ bytes: NFSE_NACIONAL.bytes() });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    for (const k of Object.keys(r.value)) {
      assert.equal(ALLOWED_KEYS.has(k), true, `campo inesperado: ${k}`);
    }
    assert.equal('text' in r.value, false);
    assert.equal('rawText' in r.value, false);
  });

  it('CA6: XXE — entidade externa NÃO é resolvida (sem vazar conteúdo de arquivo)', async () => {
    const reader = createXmlDocumentReader();
    const r = await reader.read({ bytes: XXE_ATTACK.bytes() });
    // DOCTYPE é rejeitado antes do parse → err; o conteúdo de /etc/passwd nunca aparece no resultado.
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'malformed-document');
  });

  it('CA6/segurança: billion-laughs (DOCTYPE) → err(malformed-document), sem expansão de entidade', async () => {
    const reader = createXmlDocumentReader();
    const r = await reader.read({ bytes: BILLION_LAUGHS.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'malformed-document');
  });

  it('segurança: input acima de MAX_BYTES → err(source-too-large) (guard antes do parse)', async () => {
    const reader = createXmlDocumentReader();
    const r = await reader.read({ bytes: new Uint8Array(MAX_BYTES + 1) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'source-too-large');
  });
});

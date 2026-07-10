import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED: o adapter nativo ainda não existe (value import → ERR_MODULE_NOT_FOUND em runtime).
import { createNativePdfDocumentReader } from '#src/modules/financial/adapters/document-reader/native-pdf.ts';
import {
  NFSE_NATIVE,
  RPA_NATIVE,
  BOLETO_IDENTITY_H,
  ENCRYPTED_PDF,
  OBJSTM_PDF,
  BOMB_PDF,
  IMAGE_ONLY_PDF,
  EMPTY_PDF,
  GARBAGE,
  REDOS_UNBALANCED,
  QUADRATIC_SCAN,
  MULTI_STREAM_BOMB,
  OVERSIZE_INPUT,
  TJ_ARRAY_NFSE,
  FRAGMENTED_KEYWORD,
  DANFE_NATIVE,
  PENDING_AMPLIFY,
  HOSTILE_TOUNICODE,
  SHORT_LENGTH_FLATE,
  ZERO_LENGTH_FLATE,
  TRUNCATED_DEFLATE,
} from './_fixtures/pdf-fixtures.ts';

describe('financial/adapters/document-reader/native-pdf', () => {
  it('CA1: NFS-e nativa (WinAnsi) → campos + ISS para os VOs (resolvedVia=native-text)', async () => {
    const reader = createNativePdfDocumentReader();
    const exp = NFSE_NATIVE.expected;
    const r = await reader.read({ bytes: NFSE_NATIVE.bytes() });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const res = r.value;
    assert.equal(res.resolvedVia, 'native-text');
    assert.equal(res.type, exp.type);
    assert.equal(res.documentNumber, exp.documentNumber);
    assert.equal(res.competence?.year, exp.competence?.year);
    assert.equal(res.competence?.month, exp.competence?.month);
    assert.equal(res.supplier?.legalName, exp.legalName);
    assert.equal(res.supplier?.taxId, exp.taxId);
    assert.equal(res.grossValue?.cents, exp.grossValueCents);
    const iss = res.retentions?.[0];
    assert.equal(iss?.type, 'ISS');
    assert.equal(iss?.value.cents, 5000);
    assert.equal(iss?.rateBps, 500);
  });

  it('CA2: RPA nativa → bruto + 3 retenções; bruto − Σretenções = líquido', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: RPA_NATIVE.bytes() });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const res = r.value;
    assert.equal(res.type, 'RPA');
    assert.equal(res.grossValue?.cents, 100000);
    const rets = res.retentions ?? [];
    assert.equal(rets.length, 3);
    const byType = new Map(rets.map((x) => [x.type, x.value.cents]));
    assert.equal(byType.get('INSS'), 11000);
    assert.equal(byType.get('IRRF'), 7500);
    assert.equal(byType.get('ISS'), 5000);
    const totalRet = rets.reduce((acc, x) => acc + x.value.cents, 0);
    assert.equal((res.grossValue?.cents ?? 0) - totalRet, RPA_NATIVE.netValueCents);
  });

  it('CA3: boleto Identity-H → valor via CMap /ToUnicode SEM garbling', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: BOLETO_IDENTITY_H.bytes() });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.type, 'Boleto');
    // Sem parsear o ToUnicode o valor viria garbled/ausente; 123456 prova o caminho Identity-H.
    assert.equal(r.value.grossValue?.cents, BOLETO_IDENTITY_H.expected.grossValueCents);
  });

  it('CA4: PDF cifrado (/Encrypt) → err(unsupported-pdf-structure)', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: ENCRYPTED_PDF.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'unsupported-pdf-structure');
  });

  it('CA4: PDF com object stream (/ObjStm) → err(unsupported-pdf-structure)', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: OBJSTM_PDF.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'unsupported-pdf-structure');
  });

  it('CA5: bomba de descompressão → err(decompression-limit-exceeded)', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: BOMB_PDF.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'decompression-limit-exceeded');
  });

  it('CA6: PDF só-imagem (sem texto) → err(scanned-unsupported)', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: IMAGE_ONLY_PDF.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'scanned-unsupported');
  });

  it('CA7: bytes vazios → err(empty-input); lixo não-PDF → err(malformed-document)', async () => {
    const reader = createNativePdfDocumentReader();
    const empty = await reader.read({ bytes: EMPTY_PDF.bytes() });
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.error, 'empty-input');
    const garbage = await reader.read({ bytes: GARBAGE.bytes() });
    assert.equal(garbage.ok, false);
    if (!garbage.ok) assert.equal(garbage.error, 'malformed-document');
  });

  // --- Regressão de segurança (W2 — security-backend-expert) -------------------

  it('F1: parênteses sem fechar NÃO travam o tokenizer (O(n), termina < 2s)', async () => {
    const reader = createNativePdfDocumentReader();
    const start = performance.now();
    const r = await reader.read({ bytes: REDOS_UNBALANCED.bytes() });
    const elapsed = performance.now() - start;
    assert.equal(r.ok, false); // sem campos fiscais reconhecíveis
    assert.ok(elapsed < 2000, `tokenizer levou ${elapsed.toFixed(0)}ms (esperado O(n) < 2s)`);
  });

  it('F2: muitas ocorrências de "stream" varrem em O(n) (< 2s), não O(n²)', async () => {
    const reader = createNativePdfDocumentReader();
    const start = performance.now();
    await reader.read({ bytes: QUADRATIC_SCAN.bytes() });
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 2000, `extractStreams levou ${elapsed.toFixed(0)}ms (esperado O(n) < 2s)`);
  });

  it('F3: N streams somando acima do teto agregado → err(decompression-limit-exceeded)', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: MULTI_STREAM_BOMB.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'decompression-limit-exceeded');
  });

  it('F4: input acima de MAX_BYTES → err(source-too-large) (guard antes do parse)', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: OVERSIZE_INPUT.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'source-too-large');
  });

  // --- #386 Fatia 1: PDF real (TJ, reconstrução de linha, DANFE) ---------------
  it('CA1 (#386): operador TJ (array) → extrai texto e classifica (hoje scanned-unsupported)', async () => {
    const reader = createNativePdfDocumentReader();
    const exp = TJ_ARRAY_NFSE.expected;
    const r = await reader.read({ bytes: TJ_ARRAY_NFSE.bytes() });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.type, exp.type);
    assert.equal(r.value.documentNumber, exp.documentNumber);
    assert.equal(r.value.grossValue?.cents, exp.grossValueCents);
  });

  it('CA2 (#386): reconstrução de linha — palavra-chave fragmentada em 2 Tj na mesma linha', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: FRAGMENTED_KEYWORD.bytes() });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.type, 'NFS-e');
    // "Valor Tot"+"al: R$ 700,00" reconstruídos na mesma linha → gross casa.
    assert.equal(r.value.grossValue?.cents, FRAGMENTED_KEYWORD.expected.grossValueCents);
  });

  it('CA3 (#386): detectType classifica DANFE (hoje malformed-document)', async () => {
    const reader = createNativePdfDocumentReader();
    const exp = DANFE_NATIVE.expected;
    const r = await reader.read({ bytes: DANFE_NATIVE.bytes() });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.type, 'DANFE');
    assert.equal(r.value.grossValue?.cents, exp.grossValueCents);
  });

  it('F5 (#386): muitos operandos sem Tj → teto MAX_PENDING_OPERANDS contém amplificação (termina rápido)', async () => {
    const reader = createNativePdfDocumentReader();
    const t0 = performance.now();
    const r = await reader.read({ bytes: PENDING_AMPLIFY.bytes() });
    const elapsed = performance.now() - t0;
    // Sem o teto, 300k operandos acumulados explodiriam heap/tempo; com o teto, termina rápido.
    assert.ok(elapsed < 2000, `esperado < 2s, foi ${elapsed.toFixed(0)}ms`);
    // Sem texto mostrado (nenhum Tj/TJ) → sem conteúdo útil.
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'scanned-unsupported');
  });

  // --- #389: CMap /ToUnicode hostil não pode vazar RangeError pela borda do port ------
  it('#389: CMap /ToUnicode com codepoint > 0x10FFFF → Result (não vaza RangeError)', async () => {
    const reader = createNativePdfDocumentReader();
    // Sem a guarda de faixa, parseToUnicode lançaria RangeError não capturado (CWE-248),
    // que atravessa readNative → read e falsifica o contrato "reader só devolve Result".
    const r = await reader.read({ bytes: HOSTILE_TOUNICODE.bytes() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'scanned-unsupported');
  });

  // --- #388 2a: stream FlateDecode com /Length errado/truncado (PDFsharp) ------------
  it('#388 2a: /Length Flate curto → recupera via endstream recovery e classifica (hoje malformed)', async () => {
    const reader = createNativePdfDocumentReader();
    const exp = SHORT_LENGTH_FLATE.expected;
    const r = await reader.read({ bytes: SHORT_LENGTH_FLATE.bytes() });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.type, exp.type);
    assert.equal(r.value.documentNumber, exp.documentNumber);
    assert.equal(r.value.grossValue?.cents, exp.grossValueCents);
  });

  it('#388 2a: /Length declarado=0 → recupera via endstream (pdf.js recovery), não Z_SYNC_FLUSH', async () => {
    const reader = createNativePdfDocumentReader();
    const exp = ZERO_LENGTH_FLATE.expected;
    const r = await reader.read({ bytes: ZERO_LENGTH_FLATE.bytes() });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.type, exp.type);
    assert.equal(r.value.grossValue?.cents, exp.grossValueCents);
  });

  it('#388 2a: deflate truncado no arquivo (/Length correto) → recupera via Z_SYNC_FLUSH (rede final)', async () => {
    const reader = createNativePdfDocumentReader();
    const r = await reader.read({ bytes: TRUNCATED_DEFLATE.bytes() });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.type, 'NFS-e');
    assert.equal(r.value.grossValue?.cents, TRUNCATED_DEFLATE.expected.grossValueCents);
  });
});

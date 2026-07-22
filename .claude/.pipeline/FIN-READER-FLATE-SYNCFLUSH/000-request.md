# FIN-READER-FLATE-SYNCFLUSH — Fatia 2a: `/Length` Flate curto (#388)

**Issue:** #388 (sub-fatia 2a) · **Spec:** `035-fin-reader-deep-extract` · **Size:** S
**Módulo:** `financial/adapters/document-reader` · **PDF alvo:** `NFSE_00462171_FILU.pdf`

## Problema

`NFSE_FILU` (gerador PDFsharp 6.2.2) declara `/Length` do content stream `/FlateDecode` **menor** que o
deflate real. `extractStreams` (`pdf-lowlevel.ts:80`) fatia o stream ao `/Length` declarado →
`inflateGuarded` recebe o deflate **truncado** → `inflateSync` e `inflateRawSync` falham
(`unexpected end of file`) → `err('malformed-document')`. O documento não é lido, mesmo tendo texto.

## Causa-raiz

Research byte-a-byte da feature 035 (`research.md`): não é "stream não-comprimido" (issue #388). É
`/Length` curto. Validado: truncar 4 bytes finais do deflate faz `inflateSync`/`inflateRawSync` falharem,
mas `inflateSync(data, { finishFlush: Z_SYNC_FLUSH })` recupera **100%**.

## Critério de aceite (Dado/Quando/Então)

- **Dado** um PDF com stream `/FlateDecode` cujo `/Length` declarado é menor que o deflate real (final
  truncado), **Quando** `read(bytes)`, **Então** o low-level infla via `Z_SYNC_FLUSH` (após `inflateSync`/
  `inflateRawSync` falharem), **valida** o resultado, e o texto é extraído (NFS-e classifica).
- **Dado** um deflate genuinamente corrompido (não apenas curto), **Quando** inflar, **Então** o
  resultado é rejeitado (`err`) — a validação pós-`Z_SYNC_FLUSH` não aceita lixo (`Zlib.md:439-443`).

## Solução

3º fallback em `inflateGuarded` (`pdf-lowlevel.ts`): `inflateSync(data, { finishFlush: Z_SYNC_FLUSH,
maxOutputLength: MAX_INFLATE })`, com validação do resultado (não-vazio / plausível). Fail-closed se falhar.

## DoD

W0 RED (fixture `SHORT_LENGTH_FLATE`, shortBy=4) → W1 (Z_SYNC_FLUSH+validação) → W2 (security: não aceitar
corrompido) → W3 verde. Suíte da Fatia 1 permanece 17/17 (CA-regressão).

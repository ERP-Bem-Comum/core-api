# W0 — Testes RED · FIN-READER-FLATE-SYNCFLUSH (#388 2a)

**Skill:** `tdd-strategist` · **Outcome:** RED

## Fixtures sintéticos (por modo de falha do `/Length`)
- `SHORT_LENGTH_FLATE` — `/Length` declarado curto (shortBy=4); deflate **completo** no arquivo.
- `ZERO_LENGTH_FLATE` — `/Length` declarado = 0 (deflate completo no arquivo).
- `TRUNCATED_DEFLATE` — `/Length` correto, mas o deflate está **truncado no ARQUIVO** (cut=4).

## Validação empírica prévia
Script no scratchpad confirmou: truncar 4 bytes finais → `inflateSync`/`inflateRawSync` falham
(`unexpected end of file`), `inflateSync(data, { finishFlush: Z_SYNC_FLUSH })` recupera **FULL(110)**.

## Evidência RED
- `SHORT`/`ZERO`: hoje `inflateGuarded` falha → `err('malformed-document')` (o `assert ok=true` falha).
- `ZERO` prova que o `Z_SYNC_FLUSH` **sozinho não basta** (0 bytes fatiados ao `/Length`) → motiva o recovery.

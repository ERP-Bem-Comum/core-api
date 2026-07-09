# W0 — Testes RED · FIN-READER-TOUNI-GUARD (#389)

**Skill:** `tdd-strategist` · **Outcome:** RED

## Fixture sintético (por técnica, sem PII)

`buildHostileToUnicodePdf(destHex)` em `_fixtures/pdf-builder.ts`: monta 2 streams FlateDecode —
content-stream (`<0001> Tj`) + CMap `/ToUnicode` com `beginbfchar <0001> <FFFFFF> endbfchar`
(`0xFFFFFF` = 16777215 > `0x10FFFF`). Exposto como fixture `HOSTILE_TOUNICODE`.

## Teste

`#389: CMap /ToUnicode com codepoint > 0x10FFFF → Result (não vaza RangeError)` — espera
`r.ok === false` e `r.error === 'scanned-unsupported'` (mapeamento inválido ignorado → sem texto útil).

## Evidência RED

```
✖ #389: CMap /ToUnicode com codepoint > 0x10FFFF → Result (não vaza RangeError)
  RangeError: Invalid code point 16777215
      at String.fromCodePoint (<anonymous>)
      at parseToUnicode (native-pdf.ts:64:49)
      at readNative (native-pdf.ts:266:42)
      at Object.read (native-pdf.ts:280:12)
```

O `RangeError` atravessa a borda do port (não é falha de assertion) → prova o defeito descrito no #389.

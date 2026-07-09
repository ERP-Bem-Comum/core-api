# W1 — GREEN — FIN-DOC-READER-NATIVE

Wave W1 (implementação mínima). Skill: **`ports-and-adapters`** + agente **`nodejs-runtime-expert`** (zlib/bytes). Módulo `financial`, feature 034 (reader PDF nativo), ADR-0050 + ADR-0011. **Parser PDF in-house — 0 dependência de runtime nova** (caminho principal 100% `node:zlib`).

## Entregue

1. **`adapters/document-reader/pdf-lowlevel.ts`** — primitivas de baixo nível:
   - `detectStructure` — aceita xref clássico; recusa `/Encrypt`, `/ObjStm`, `/Type /XRef` (stream) → `unsupported-pdf-structure`.
   - `inflateGuarded` — `inflateSync`/`inflateRawSync` com `maxOutputLength = MAX_INFLATE (8 MiB)`; **distingue bomba de corrupção** por `code` do erro (empírico: `ERR_BUFFER_TOO_LARGE` → `decompression-limit-exceeded`; `Z_DATA_ERROR` → tenta raw → `malformed-document`).
   - `extractStreams` — varredura de streams (dict + bytes via `/Length`; latin1 → índice = offset de byte).
2. **`adapters/document-reader/native-pdf.ts`** — `createNativePdfDocumentReader(): DocumentReaderPort`:
   - **Tokenizer** de content-stream (`(literal) Tj` e `<hex> Tj`).
   - **Identity-H** via CMap `/ToUnicode` (`bfchar` code→Unicode) — decodifica os códigos 2-byte sem garbling.
   - **Sem texto** recuperável → `scanned-unsupported`.
   - **Estruturação por tipo** (NFS-e/RPA/Boleto) com âncoras; parser de dinheiro **BR** (`1.000,00`→cents, sem float); retenções → VO `Retention`; competência → VO `Competencia`; valor → VO `Money`.
3. **Builder de fixtures validado** (W0) — WinAnsi + Identity-H/ToUnicode + variantes.

## Métrica de aceite (o "12/12" do dono, adaptado)

**Todos os campos das fixtures sintéticas extraídos certos — 0 valor errado.** O parser nativo bateu a métrica; o **gate de escape (`unpdf`) NÃO foi acionado**.

## CA → resultado

| CA | Estado |
| :-- | :-- |
| CA1 NFS-e nativa (WinAnsi) | ✔ |
| CA2 RPA (bruto − Σret = líquido) | ✔ |
| CA3 Boleto Identity-H (via ToUnicode, sem garbling) | ✔ |
| CA4 `/Encrypt` + `/ObjStm` → unsupported-pdf-structure | ✔ |
| CA5 bomba → decompression-limit-exceeded | ✔ |
| CA6 só-imagem → scanned-unsupported | ✔ |
| CA7 vazio/lixo → empty-input/malformed-document | ✔ |

## Gates (parciais — W3 roda o completo)

```
node --test tests/**/document-reader/*.test.ts → tests 29 · pass 29 · fail 0  (11 port + 10 xml + 8 native)
pnpm run typecheck                              → exit 0
eslint (document-reader)                        → 0 errors
```

Nota lint: `prefer-readonly-parameter-types` em módulos de parsing de bytes (`Uint8Array` sem variant readonly no TS 6) → `eslint-disable` file-level justificado; loops regex como `for` (concilia `init-declarations` × `no-useless-assignment`). Próximo: **W2** (audit — pureza/Result/minimização + **segurança de parsing binário/anti-bomb**) via `code-reviewer` + `security-backend-expert`.

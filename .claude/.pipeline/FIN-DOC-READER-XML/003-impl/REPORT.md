# W1 — GREEN — FIN-DOC-READER-XML

Wave W1 (implementação mínima). Skill: **`ports-and-adapters`** + agente **`nodejs-runtime-expert`** (TextDecoder/encoding). Módulo `financial`, feature 034 (reader XML), ADR-0050 + ADR-0011 §5.

## Entregue

1. **`fast-xml-parser@5.7.3` promovido a dependência direta** (`pnpm add fast-xml-parser@5.7.3` → `Already up to date`, **0 downloads** — já no lockfile via `@aws-sdk`). Checklist ADR-0011 §5: MIT, versão pinada exata (casa com o lockfile), superfície de supply-chain nova ~0.
2. **`adapters/document-reader/xml.ts`** — `createXmlDocumentReader(): DocumentReaderPort`. Parse **path-aware** de NFS-e Nacional (`NFSe/infNFSe/…`) e NF-e 4.00 (`nfeProc/NFe/infNFe/…`) → `DocumentReaderResult` com `resolvedVia:'xml'`, mapeando para os VOs canônicos `Money`/`Competencia`/`Retention` do agregado `Document`.

## Decisões grounded (empíricas, não "de memória")

Config do parser validada por micro-teste da lib (não por suposição):

- **Anti-XXE:** `fast-xml-parser` **lança `External entities are not supported`** em `<!ENTITY … SYSTEM …>` (independe de `processEntities`) → capturado em `parseRoot` → `malformed-document`. Sem SSRF/leitura de arquivo por construção (CA6).
- **`processEntities: true`** decodifica as entidades XML padrão (`&amp;`→`&`); `false` deixaria garbling.
- **`parseTagValue: false`** preserva `0000000001234` (zeros à esquerda) e decimais como string (evita perda/float).
- **Encoding (CA4):** `sniffEncoding` lê o `encoding="…"` do prólogo (decode latin1 dos 256 primeiros bytes) e `TextDecoder(enc)` honra `ISO-8859-1`/`windows-1252` — sem garbling de acento.
- **Money sem float:** `decimalToCents` via regex string (`'1234.56'` → `123456`), nunca `parseFloat`. `pAliq '5.00'` → `500` bps pela mesma função.

## CA → resultado

| CA | Estado |
| :-- | :-- |
| CA1 NFS-e → VOs (ISS retido) | ✔ |
| CA2 NF-e → DANFE path-aware | ✔ |
| CA3 erros (empty/malformed/unknown) | ✔ |
| CA4 encoding ISO-8859-1 | ✔ |
| CA5 minimização LGPD | ✔ |
| CA6 XXE fechado | ✔ |

## Gates (parciais — W3 roda o completo)

```
node --test  tests/**/document-reader/*.test.ts  → tests 19 · pass 19 · fail 0  (11 port + 8 xml)
pnpm run typecheck                                → exit 0
eslint (document-reader)                          → 0 errors
```

Nota lint: `prefer-readonly-parameter-types` em params `Uint8Array`/`Node` resolvidos por `Readonly<Record>` + `eslint-disable` justificado (precedente `document-storage.ts`). Próximo: **W2** (audit — pureza/Result/minimização + **XXE/segurança**) via `code-reviewer` + `security-backend-expert`.

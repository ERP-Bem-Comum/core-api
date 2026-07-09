# FIN-DOC-READER-NATIVE — escopo

> Feature **034-fin-documento-reader** (fatia 2, reader PDF nativo — **o coração**). Módulo **`financial`**. Épico **#62**. Size **L**.
> Ancorado em **ADR-0050** (cascata nativo-first) + **ADR-0011** (evitar-libs: caminho principal `node:zlib` nativo). Consome a fundação `FIN-DOC-READER-PORT` (contrato EN + VOs canônicos — **NÃO** redefinir).

## Escopo (in)

1. **`adapters/document-reader/pdf-lowlevel.ts`** — primitivas de baixo nível sobre `node:zlib`:
   - **Guarda de estrutura:** aceitar apenas **xref clássico**; se `/XRef`(stream) / `/ObjStm` / `/Encrypt` → `unsupported-pdf-structure` (decisão empírica, research.md §3.1).
   - **Inflate guardado:** `zlib.inflateSync`/`inflateRawSync` com `maxOutputLength` explícito → `decompression-limit-exceeded` no estouro (anti-bomb; `handbook/reference/nodejs/Zlib.md:837`).
   - **Tokenizer de content-stream:** extrair as strings mostradas dos operadores `Tj`/`TJ` (com `BT/ET`, `Td/TD/Tm` como contexto).
2. **`adapters/document-reader/native-pdf.ts`** — `createNativePdfDocumentReader(): DocumentReaderPort`:
   - **Decodificação:** `WinAnsiEncoding`/`StandardEncoding` direto; fontes **`Identity-H`** → parsear o CMap **`/ToUnicode`** (`bfchar`/`bfrange`) e mapear os códigos 2-byte para Unicode (evita garbling — CA3).
   - **Sem texto recuperável** (só imagem, ou `/ToUnicode` ausente em Identity-H) → `scanned-unsupported`.
   - **Estruturação por tipo:** sobre o texto fiel, extrair campos por âncoras/regex (CNPJ/CPF, valores R$, datas, competência) → `DocumentReaderResult` com `resolvedVia:'native-text'` + VOs `Money`/`Competencia`/`Retention`/`DocumentType`.
3. **Builder de fixtures** `tests/.../_fixtures/pdf-builder.ts` — monta PDFs **sintéticos** (classic-xref + content-stream FlateDecode) com dados fiscais **falsos**, byte-exatos e determinísticos. Inclui um boleto com fonte `Identity-H` + `/ToUnicode` (CA3). **Sem PII.**

## Fora de escopo

- Reader XML (`FIN-DOC-READER-XML` — entregue) e orquestração final (`FIN-DOC-READER-CASCADE`).
- OCR de imagem/escaneado (ADR-0050 degrau 3 — adiado).
- Borda HTTP + storage + wiring ao `Document` (fatia 2 de feature).

## Critérios de aceite (contra **fixtures PDF sintéticas** — dados FALSOS)

- **CA1 — NFS-e nativa.** PDF nativo de NFS-e → `resolvedVia='native-text'`, `type='NFS-e'`, `documentNumber`, `supplier`, `grossValue`, `competence` = gabarito sintético (0 valor errado).
- **CA2 — RPA nativa.** RPA nativo → `grossValue` + retenções (INSS/ISS/IRRF como `Retention` VO); confere `bruto − Σretenções = líquido`.
- **CA3 — Boleto Identity-H.** Boleto com fonte `Identity-H` → extrai valor + vencimento **via CMap `/ToUnicode`** sem garbling.
- **CA4 — estrutura não-suportada.** PDF com xref-stream/`/ObjStm`/`/Encrypt` → `err('unsupported-pdf-structure')`.
- **CA5 — anti-bomb.** Stream que infla além do limite → `err('decompression-limit-exceeded')`.
- **CA6 — escaneado.** PDF sem texto recuperável → `err('scanned-unsupported')`.
- **CA7 — erros triviais.** Bytes vazios → `err('empty-input')`; não-PDF/lixo → `err('malformed-document')`.

## Pipeline (agentes por wave)

| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED — builder de PDF sintético + testes CA1–CA7 | skill **`tdd-strategist`** + agente **`nodejs-runtime-expert`** (zlib/bytes) |
| W1 | `pdf-lowlevel` + `native-pdf` (inflate guardado, tokenizer, ToUnicode, estruturação) | skill **`ports-and-adapters`** + agente **`nodejs-runtime-expert`** |
| W2 | audit (pureza, Result, minimização, **anti-bomb/segurança de parsing binário**) | skill **`code-reviewer`** + agente **`security-backend-expert`** |
| W3 | gate | skill **`ts-quality-checker`** |

## Gate de escape (ADR-0011 §5, plan.md:99)

Se o parser nativo não bater a métrica no W0/W1 (ex.: `/ToUnicode` intratável in-house), acionar fallback **`unpdf` (MIT)** — decisão registrada, não silenciosa.

## DoD

Gate W3 verde. `pdf-lowlevel` + `native-pdf` extraem os campos das fixtures sintéticas (0 valor errado), com erros explícitos para todo caso não-suportado. Desbloqueia (com o XML) o `FIN-DOC-READER-CASCADE`.

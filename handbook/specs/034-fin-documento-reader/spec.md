<!--
SPEC (fase spec-driven, pré-W0). Idioma: PT-BR (doc). Erros EN kebab. Eventos EN passado.
Ancorada em ADR-0050 (Accepted). Pesquisa: research.md (5 fontes).
-->

# SPEC — Motor de Leitura de Documento Fiscal (`fin-documento-reader`, fatia 1)

> **Tipo:** feature · **Size:** L (fatiada) · **Módulo:** `financial` · **Épico:** #62
> **ADRs:** **ADR-0050** (cascata nativo-first, Accepted) · ADR-0006 (ports&adapters) · ADR-0011 (evitar-libs) · ADR-0019/0021 (storage) · ADR-0027 (Zod borda)
> **Status:** aprovada a diretriz (dono, 2026-07-08). Fatia 1 = **o motor de leitura puro** (sem borda/storage — fatia 2).

## 1. Problema & contexto (o PORQUÊ)

O operador de Contas a Pagar digita à mão todos os campos de cada documento fiscal (fornecedor, CNPJ, valores, retenções, datas) — lento, propenso a erro fiscal, não rastreável. O agregado `Document` + geração de títulos **já existem** (`FIN-DOCUMENTO-TITULOS`, PR #38). Falta a **leitura automática** que extrai os campos de um PDF/XML para **pré-preencher** o rascunho — que o humano então confere e confirma (o motor **nunca** confirma sozinho, #62 CA4).

O benchmark do dono provou que, para a amostra real (100% PDF nativo), um **parser de texto nativo** extrai 12/12 campos em ~ms de CPU, 0 alucinação — melhor/mais barato/mais fiel que OCR de imagem, que fica como fallback adiado (ADR-0050).

## 2. Escopo desta fatia (o motor puro)

**IN:**

- `DocumentReaderPort` (application) — `read(input) → Promise<Result<DocumentReaderResult, DocumentReaderError>>`, recebendo **bytes** (nunca URL).
- Adapter **XML** (NFS-e Nacional/DANFSe, NF-e) — topo da cascata.
- Adapter **texto nativo** (PDF digital, in-house: `node:zlib` + tokenizer + `/ToUnicode`).
- Adapter **cascata** que orquestra XML → nativo → `scanned-unsupported`.
- Adapter **mock** (testes determinísticos).
- `DocumentReaderResult` = campos tipados (minimização) + `resolvedVia`.

**OUT (fatias/tickets seguintes):**

- Borda HTTP de ingestão + storage do PDF-fonte (fatia 2 — reusa `contracts`).
- Wiring ao `Document` (pré-preenche rascunho) (fatia 2).
- **OCR de imagem/escaneado** (microserviço externo) — **adiado** (ADR-0050 degrau 3).
- Divergência de alíquota (#290) · extrato bancário via PDF (#145) · enriquecimento cross-módulo.

## 3. Critérios de aceitação (viram os testes do W0 — contra **fixtures sintéticas**)

> Fixtures: PDFs/XMLs **sintéticos** gerados no repo (dados fiscais **falsos** mas estruturalmente fiéis ao gabarito). O gabarito real é PII local, **não-versionável** (`research.md` F1).

- **CA1 — NFS-e nativa (PDF).** Dado um PDF nativo de NFS-e, quando `read(bytes)`, então extrai `tipo=NFS-e`, número, prestador/CNPJ, tomador/CNPJ, valor bruto, competência; `resolvedVia='native-text'`; **todos os campos = gabarito sintético** (0 errado).
- **CA2 — RPA nativa (PDF).** Dado RPA nativo, então extrai bruto + retenções (INSS/ISS/IRRF) + líquido, conferindo `bruto − retenções = líquido`; 0 valor errado.
- **CA3 — Boleto nativo (PDF, Identity-H).** Dado boleto com fonte `Identity-H`, então extrai valor e vencimento **via CMap `/ToUnicode`** (sem garbling) — prova o caminho de encoding 2-byte.
- **CA4 — XML tem precedência.** Dado o mesmo documento como XML (NFS-e/NF-e), então a cascata resolve por XML (`resolvedVia='xml'`) e extrai os campos 100% estruturados.
- **CA5 — escaneado/imagem → sem valor errado.** Dado um PDF sem texto (só imagem), então `err('scanned-unsupported')` — **nunca** um valor inventado.
- **CA6 — estrutura não suportada.** Dado PDF cifrado (`/Encrypt`) ou xref-stream/ObjStm, então `err('unsupported-pdf-structure')` (escala p/ OCR/manual).
- **CA7 — decompression bomb.** Dado stream que infla além do teto, então `err('decompression-limit-exceeded')` (guard `maxOutputLength`), sem estourar memória.
- **CA8 — tamanho.** Dado input acima do teto de bytes, então `err('source-too-large')`.
- **CA9 — minimização (LGPD).** O `DocumentReaderResult` contém **só campos** (fornecedor/CNPJ, valores, retenções, competência) + `resolvedVia` — **nunca** texto bruto/OCR; nenhum log emite bytes/texto/resultado.

## 4. Não-objetivos

Não implementar borda HTTP, storage, wiring ao `Document`, OCR de imagem, divergência de alíquota, extrato bancário, enriquecimento cross-módulo. Não usar cloud OCR (LGPD, ADR-0050). Não usar `mupdf`/`pdf2json`/`pdfjs-dist` direto (ADR-0050 §4) — in-house, e `unpdf` só como fallback gated.

## 5. Plano técnico de alto nível (o COMO — sem código; detalhe em `plan.md`)

```
read(input: DocumentReaderInput)            // input = { bytes, declaredMime? }
   │
   ├─ é XML?  → xmlReader  ──► DocumentReaderResult { resolvedVia:'xml' }
   ├─ é PDF nativo (tem texto)? → nativeReader (node:zlib + tokenizer + ToUnicode)
   │                              └─► DocumentReaderResult { resolvedVia:'native-text' }
   ├─ PDF só-imagem?           → err('scanned-unsupported')   // degrau 3 adiado
   └─ cifrado/xref-stream?     → err('unsupported-pdf-structure')
```

Camadas: `domain/document-reader/` (types + erros, puro) · `application/ports/document-reader.ts` (port) · `adapters/document-reader/{native,xml,mock,cascade}.ts`.

## 6. Constitution check (aderência)

| Fonte                      | Exigência                               | Como adere                                                                                                 |
| :------------------------- | :-------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| ADR-0050                   | cascata nativo-first, port recebe bytes | port `read(bytes)`, cascata XML→nativo→adiado                                                              |
| ADR-0011                   | evitar-libs / checklist §5              | caminho principal `node:zlib`/`fetch` nativos; `fast-xml-parser` já no lockfile; `unpdf` só fallback gated |
| ADR-0006                   | ports & adapters, isolamento `fin_`     | port `type Readonly<{}>`; adapters trocáveis; sem cross-módulo                                             |
| ADR-0027                   | Zod na borda                            | (fatia 2 — borda)                                                                                          |
| `.claude/rules/domain.md`  | `Result`, sem throw cruzando borda      | reader devolve `Result`; adapter converte exceção→erro na borda                                            |
| `.claude/rules/testing.md` | node:test + strip-types; fixtures       | W0 contra fixtures **sintéticas** (sem PII)                                                                |

## 7. Riscos & mitigações

| Risco                                                 | Sev   | Mitigação                                                                                     |
| :---------------------------------------------------- | :---- | :-------------------------------------------------------------------------------------------- |
| CMap `/ToUnicode` (boleto) complexo                   | Média | gramática bounded (bfchar/bfrange); se não bater a métrica no W0 → fallback `unpdf` (MIT)     |
| Fixture sintética não reflete PDF real                | Média | validar o reader manualmente contra a amostra real **local** (não commitável) antes de fechar |
| PDF de fornecedor com estrutura moderna (xref-stream) | Baixa | `unsupported-pdf-structure` explícito → escala; não é valor errado                            |
| "0% alucinação" em valor fiscal                       | Alta  | métrica de aceite objetiva (todos os campos = fixture); fallback explícito, nunca chute       |

## 8. Definition of Done

- [ ] CA1–CA9 cobertos por teste (W0) e verdes (W3).
- [ ] Reader nativo bate **todos os campos** das fixtures sintéticas (métrica 12/12 adaptada) — 0 valor errado.
- [ ] `DocumentReaderResult` = campos only (minimização); nenhum log de conteúdo.
- [ ] Gate W3 verde (typecheck + format + lint + test).
- [ ] Validação manual local contra a amostra real registrada (sem commitar PII).

# ADR-0050: Leitura de Documento Fiscal em Cascata (nativo-first) — supersedes ADR-0034

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Tech Lead (Gabriel — endossado 2026-07-08) + Especialista de Domínio
- **Supersedes:** [ADR-0034](./0034-ocr-port-adapter.md) (OCR como Port/Adapter Pattern)

## Contexto

O [ADR-0034](./0034-ocr-port-adapter.md) (Accepted, 2026-06-06) decidiu abstrair OCR como Port/Adapter com um `OcrPort.extract(pdfUrl): Promise<OcrResult>` e adapters `mock → Tesseract → Textract`. Ele assumia, implicitamente, que **OCR de imagem é o caminho de leitura** e que a escolha do engine (open-source vs SaaS cloud) era a decisão central.

Desde então, três evidências novas mudaram o quadro:

1. **Benchmark real do dono do produto** (`anotacoes_pessoais/ideia_para_ocr/` — local-only, não versionável): 6 ferramentas medidas contra 3 documentos fiscais reais (NFS-e, RPA, Boleto). Conclusões: **a amostra é 100% PDF nativo**; um **parser de texto nativo** acerta **12/12 campos em ~10-36 ms de CPU, 0 GPU, 0 alucinação** — enquanto OCR/VLM erram ("ó"→"6", palavras grudadas) e custam segundos + GB de VRAM. Docling é o melhor OCR (fallback escaneado), MinerU estourou a T4 (14,6 GB).

2. **Varredura byte-level empírica da amostra real** (2026-07-08): dos 8 PDFs, **`/Encrypt`=0 em todos** e **xref-stream+`/ObjStm` só em 1 (invoice não-fiscal)**. Todo documento fiscal BR usa **xref clássico + FlateDecode** (resolvido nativamente por `node:zlib`). O único trabalho de parser não-trivial é o CMap `/ToUnicode` dos boletos (Identity-H) — presente, logo texto recuperável.

3. **Pesquisa multi-fonte** (web + runtime Node + LGPD + DDD — consolidada em `specs/034-fin-documento-reader/research.md`):
   - **LGPD:** documentos carregam CPF/CNPJ/nome (dado pessoal, Lei 13.709). Cloud OCR estrangeiro é **operação de transferência internacional** (art. 33) — exige DPA anti-treinamento + base legal (art. 7) + RIPD (art. 38), nenhum existente hoje; **free-tier é sempre proibido** (treina com os dados). In-process e self-hosted **não acionam a hipótese de transferência**.
   - **Node/evitar-libs:** `node:zlib` (FlateDecode) e `fetch`/`AbortSignal.timeout` são nativos; **`fast-xml-parser` (MIT) já está no lockfile** (transitivo do `@aws-sdk/client-s3`, ADR-0019). Parser de PDF in-house é viável para o escopo observado; `unpdf` (MIT) é o fallback; **`mupdf.js` é AGPL** (colide com ADR-0011) e o próprio PyMuPDF do estudo é AGPL.
   - **Segurança:** um port que recebe `pdfUrl: string` (como no 0034) é **vetor de SSRF** e vaza URL assinada a terceiros.
   - **DDD:** o adapter de OCR externo é um **Anti-Corruption Layer** (Evans, *DDD*, p.224); o port com adapters trocáveis é **Ports & Adapters** (Vernon, *IDDD*, p.182).

O 0034 não está *errado* — está *incompleto e mal-ordenado* frente a essas evidências: trata OCR de imagem como principal, ignora o caminho nativo/XML (mais barato, mais fiel, LGPD-safe) e desenha o port com URL (inseguro).

## Decisão

Substituir o modelo do ADR-0034 por uma **cascata de leitura de documento**, nativo-first:

1. **Port renomeado e reorientado:** `DocumentReaderPort` como `type Readonly<{ read: (input: DocumentReaderInput) => Promise<Result<DocumentReaderResult, DocumentReaderError>> }>` (conforme `.claude/rules/application.md`). **Recebe bytes** (`Buffer`/`Uint8Array`) — ou uma `StorageKey` resolvida server-side via `DocumentStorage.getContent` —, **nunca uma URL vinda de input do cliente** (elimina SSRF e vazamento de URL assinada).

2. **Cascata de estratégias (ordem):**
   1. **XML estruturado** (NFS-e Nacional/DANFSe, NF-e) — 100% estruturado, melhor fonte. Parsing via **`fast-xml-parser` (MIT, já no lockfile)** ou tokenizer in-house path-aware.
   2. **Parser de texto nativo in-house** (PDF digital) — `node:zlib.inflateSync` (com `maxOutputLength` explícito, anti-decompression-bomb) + tokenizer de operadores de texto + CMap `/ToUnicode`. Cobre a amostra fiscal inteira em CPU, ~R$ 0.
   3. **OCR self-hosted** (documento escaneado/imagem) — **microserviço externo separado** (Python/ML) atrás do mesmo port, chamado por `fetch` nativo. Modelo default recomendado (2026): **PaddleOCR-VL (Apache-2.0, ~2 GB)** ou **dots.ocr (MIT)** — a validar por POC; **Docling** também válido. **Este degrau é o que o ADR-0034 chamava de "OcrPort" — segue existindo, mas como fallback, self-hosted, adiado.**
   4. **Exceção** (cifrado / estrutura não suportada / escaneado ruim) → `Result` de erro explícito → lançamento manual. **Nunca valor errado silencioso** (invariante fiscal).

3. **Adapters trocáveis, domínio blindado (ACL):** o domínio recebe um `DocumentReaderResult` de **campos tipados** (fornecedor/CNPJ, valores, retenções, competência) + `resolvedVia: 'xml' | 'native-text' | 'ocr-external'` — **não texto bruto** (minimização LGPD, art. 6 III; alimenta a trilha de auditoria, invariante cross-BC do ADR-0006). O domínio nunca confirma sozinho: a leitura pré-preenche rascunho, **humano confirma** (#62 CA4).

4. **Menor-dependência (norte: ADR-0011):** in-house nativo no caminho principal, **gated pela métrica objetiva do próprio estudo — 12/12 campos vs gabarito + 0 alucinação**; `fast-xml-parser` (já no lockfile) para XML; `fetch` nativo para o microserviço. `unpdf` (MIT) entra **só** se o in-house não bater a métrica no W0. **Proibidos:** `mupdf.js` (AGPL), Qwen2.5-VL-3B (licença Research), qualquer OCR cloud sem DPA+art.33+RIPD.

5. **Storage e borda reusam o `contracts`** (ADR-0019/0021): produção AWS S3 `sa-east-1` (residência BR; **Magalu PBE é proibido para dado real** por ADR-0021); upload `application/octet-stream`→Buffer com `bodyLimit` por rota + magic-bytes `%PDF-` + `requireAuth`+`authorize`+ownership; log nunca contém bytes/texto/resultado.

## Consequências

### Positivas
- **LGPD-safe por construção** no caminho principal (dado não sai do processo/infra BR).
- **~R$ 0 e sem GPU** no caminho principal (amostra 100% nativa); OCR pesado vira exceção.
- **Zero dependência de runtime nova** no caminho principal (`node:zlib`/`fetch` nativos; `fast-xml-parser` já presente).
- **Licença limpa** (in-house / MIT); anti-SSRF por design (bytes, não URL).
- **Go-live-safe e paralelizável** — construível 100% pela pipeline W0→W3, determinístico, isolado do módulo `contracts`/`budget-plans`.

### Negativas / trade-offs
- **Parser de PDF in-house tem custo de implementação** (~500-1500 LOC; CMap `/ToUnicode` para boletos). Mitigação: escopo definido empiricamente pela varredura; **métrica de aceite objetiva (12/12)**; fallback `unpdf` se não bater.
- **% de documentos escaneados é desconhecida** (pergunta aberta à P.O.). Mitigação: degrau 3 (escaneado) **adiado** para fatia futura; adapter retorna `scanned-unsupported` até haver volume que o justifique.
- **XML de NFS-e não é universal** (adesão municipal parcial). Mitigação: é exatamente por isso que os degraus 2 e 3 existem.
- Se, no futuro, a P.O. exigir cloud (escaneado em volume): reabrir como ADR próprio com DPA + instrumento do art. 33 + RIPD.

## Alternativas Rejeitadas

1. **Manter o ADR-0034 as-is (OCR-engine-first):** rejeitado — trata OCR de imagem como principal, desperdiça o caminho nativo/XML (mais barato/fiel/LGPD-safe) e desenha o port com URL (SSRF).
2. **Cloud OCR (Gemini/Document AI/Vision) como caminho:** rejeitado — bloqueado por LGPD sem DPA anti-treinamento + instrumento de transferência internacional (art. 33) + RIPD; free-tier proibido permanentemente.
3. **`mupdf.js` / PyMuPDF-style:** rejeitado — AGPL (copyleft de rede, colide com ADR-0011).
4. **`pdf2json`:** rejeitado — histórico de *garbling* silencioso de texto (viola o invariante "0% alucinação" em valor fiscal).
5. **Port recebendo `pdfUrl: string`:** rejeitado — SSRF + vazamento de URL assinada a terceiro.

## Referências

- [ADR-0006](./0006-modular-monolith-core-api.md) — Modular monolith + Ports & Adapters (OCR já era 1 dos 4 BCs).
- [ADR-0011](./0011-supply-chain-hardening.md) — Supply-chain (preferir nativo; checklist §5 para lib).
- [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) / [ADR-0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md) — Storage S3/MinIO; AWS `sa-east-1` primary, Magalu PBE sem dado real.
- Evans, *Domain-Driven Design*, p.224 — Anticorruption Layer (fronteira do reader externo).
- Vernon, *Implementing Domain-Driven Design*, p.182 — Hexagonal / Ports & Adapters (adapters trocáveis).
- `specs/034-fin-documento-reader/research.md` — pesquisa consolidada (5 fontes) + varredura empírica.
- Estudo local (não versionável): `anotacoes_pessoais/ideia_para_ocr/benchmarks_colab/JUNCAO.md`.
- Issues: #62 (ingestão OCR), #145 (extrato PDF), #290 (divergência de alíquota — fonte "esperado" = API Parâmetros Municipais NFS-e Nacional).

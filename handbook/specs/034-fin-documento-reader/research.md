<!--
Research (fase pré-W0) — Motor de Leitura/Ingestão de Documento Fiscal (#62).
Idioma: PT-BR (doc). Erros internos EN kebab. Fonte de verdade = ADRs + handbook.
Este research.md consolida 5 fontes; cada afirmação é citada (não "de memória").
-->

# Research — Motor de Leitura de Documento Fiscal (`fin-documento-reader`, #62)

> **Fatia:** ingestão por **leitura automática** (extrair campos de NFS-e/RPA/Boleto/DANFE para pré-preencher o `Document`). NÃO é a UI, nem a geração de títulos (já entregues por `FIN-DOCUMENTO-TITULOS`, PR #38).
> **Issues cobertas:** #62 (OCR/ingestão), #145 (extrato PDF via OCR), #290 (divergência de alíquota — fonte do "esperado").
> **Status:** research consolidado, **aguardando decisão de direção do dono** antes de spec/plan/W0.

## 0. Fontes desta pesquisa (5)

| #   | Fonte                                                                                                   | Natureza                                                                                |
| :-- | :------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------- |
| F1  | **Estudo do dono** — `anotacoes_pessoais/ideia_para_ocr/` (benchmark real de 6 ferramentas vs gabarito) | **Local-only, não versionar** (contém PII real). Referenciado por decisão, não copiado. |
| F2  | Pesquisa web (fontes oficiais gov.br/Serpro/nfe.fazenda + npm/HuggingFace)                              | agente `general-purpose` + WebSearch                                                    |
| F3  | Runtime Node 24 (evitar-libs)                                                                           | agente `nodejs-runtime-expert` + `handbook/reference/nodejs/`                           |
| F4  | LGPD + segurança + storage                                                                              | agente `security-backend-expert` + ADRs + skill web-security-backend                    |
| F5  | DDD canônico (ACL / Ports & Adapters)                                                                   | MCP `acdg-skills` (Evans, Vernon)                                                       |

---

## 1. Decisão herdada do estudo (F1) — a cascata

O benchmark do dono (`ideia_para_ocr/benchmarks_colab/JUNCAO.md`) rodou 6 ferramentas contra 3 documentos reais da P.O. (Boleto, NFS-e MEI, RPA) e concluiu:

- **Parser de texto nativo VENCE** em PDF nativo: **~10-36 ms em CPU, 0 GPU, 12/12 campos corretos, 0 alucinação** (`06_parser_nativo/RESULTADOS.md`). A **amostra real da P.O. é 100% PDF nativo**.
- **Docling** = melhor custo-benefício de OCR para escaneado (1,25 GB VRAM, Apache-2.0); **MinerU** = 14,6 GB (estourou a T4).
- **Cloud (Gemini/DocAI/Vision) bloqueado por LGPD**; free-tier do Gemini **proibido** (treina com os dados).
- **Arquitetura escolhida — cascata:** `XML estruturado → parser de texto nativo → OCR self-hosted (fallback escaneado) → exceção (VLM pesado / cloud com DPA)`.
- **Pergunta-chave em aberto (à P.O.):** qual a **% real de documentos escaneados** vs nativos? Decide se o degrau OCR é urgente ou raro.

**As 4 frentes de pesquisa a seguir validaram, atualizaram e ancoraram essa decisão para o mundo do core-api (Node/TS, ADRs, evitar-libs, LGPD).**

---

## 2. Universalidade do XML (F2) — o topo da cascata é real, mas parcial

- **NF-e / DANFE:** XML é **padrão nacional consolidado e automatizável** — web service `NFeDistribuiçãoDFe` entrega o XML a qualquer ator informado na nota (destinatário incluso) por NSU/CNPJ, com certificado digital. Fonte oficial: NT 2014.002 (nfe.fazenda.gov.br). → **caminho XML garantido para NF-e**.
- **NFS-e:** existe padrão **nacional** (Res. CGNFS-e 3/2023, RFB+ABRASF+Serpro; o **XML** é o doc legal, o **DANFSe** é só o PDF). O **ADN** distribui ao **tomador** via API DF-e (`nfse.gov.br/swagger/contribuintesissqn`). **PORÉM a adesão é municipal e ainda parcial** → fornecedor em município não-aderente, ou nota entregue só em PDF, **cai no degrau 2/3**.

**Implicação:** o XML é o topo correto (100% estruturado, sem alucinação), mas **a existência dos degraus "parser nativo" e "OCR" é justamente justificada pela lacuna do NFS-e**. A cascata não é over-engineering — é a resposta ao fato de que o XML não chega para todo fornecedor.

---

## 3. Reader em Node com dependência mínima (F3) — o veredito do "evitar libs"

Honestidade do agente Node: nesta sessão **não houve rede** para confirmar metadados de npm de libs ainda não instaladas — o que é `local-verificável` está citado do repo; o resto está marcado como "confirmar com `pnpm info`".

### 3.1. PDF nativo — inflate é nativo, o parser de objetos não é "só zlib"

- **Nativo (100%):** `node:zlib.inflateSync`/`inflateRawSync` cobre `FlateDecode` — a **mesma zlib C** que o PyMuPDF do estudo chama por baixo, logo custo de CPU comparável. Fonte: `handbook/reference/nodejs/Zlib.md:1586`. **MUST:** passar `maxOutputLength` explícito (default é `buffer.kMaxLength` = GBs → **decompression bomb** em upload adversarial; `Zlib.md:837-838`).
- **O que encarece/quebra o zero-dep in-house** (ordem de risco para NFS-e/RPA/Boleto):
  1. **xref stream + ObjStm** (PDF ≥1.5 — comum em geradores modernos: iText7, headless Chrome, LibreOffice, muitos sistemas de prefeitura). Exige um mini-parser do modelo de objetos ISO 32000 (tokenizer de `/Nome`, `<<dict>>`, `12 0 R`, resolução xref clássica vs stream vs híbrida). **É o que separa "zero-dep de verdade" de "zero-dep de brinquedo".**
  2. **CMap `/ToUnicode` + `Identity-H`** (caminho principal de PDF gerado de HTML/Java) — recuperar Unicode exige parsear o CMap; se o gerador **omitir** `/ToUnicode`, não há texto sem OCR.
  3. **PDF cifrado (`/Encrypt`)** — boletos às vezes; **fora do v1**, escalar para OCR/manual via erro explícito.
- **Veredito:** in-house é **viável para os 3 tipos**, mas é parser real (~500-1500 LOC), não "zlib + regex". **Decidir empiricamente**: antes de escrever `src/`, varrer a amostra real (grep binário via `nodejs-fs-scripter`, read-only) por `/XRef`, `/ObjStm`, `/Encrypt`, `/ToUnicode`, `/Identity-H` — no espírito do próprio benchmark do dono.
- **Se lib for inevitável:** **`unpdf` (MIT, wrapper fino/tree-shaken de pdfjs, sem canvas)** — recomendada; herda o parser maduro da Mozilla. **Evitar `pdf2json`** (garbling silencioso — pior que falhar explícito, contra o requisito "0% alucinação"). **Descartar `mupdf.js` (AGPL)** — copyleft de rede colide com ADR-0011. Nota: o **PyMuPDF do estudo é AGPL/comercial** — ir in-house Node **também evita herdar essa licença**, algo que nem o benchmark resolveu. Qualquer lib passa pelo checklist ADR-0011 §5.

### 3.2. XML — mais fácil, e a lib já está no lockfile

- Tokenizer in-house **path-aware** (com pilha de profundidade) é viável e de **menor esforço que o PDF** (XML é um stream de texto, sem container binário/xref). **Descartar regex puro** (tags de mesmo nome em profundidades diferentes → valor errado silencioso; bloco `ds:Signature` com base64 confunde regex). Encoding `ISO-8859-1`/`windows-1252` (comum em XML de governo BR) é nativo via `TextDecoder` (Node 24 full ICU — `handbook/reference/nodejs/Utilities.md:2690`).
- **Achado forte:** **`fast-xml-parser@5.7.3` (MIT) JÁ está no `pnpm-lock.yaml`** (transitivo via `@aws-sdk/xml-builder` ← `@aws-sdk/client-s3`, ADR-0019). Licença MIT confirmada localmente em `node_modules/.pnpm/fast-xml-parser@5.7.3/.../package.json`. **Promovê-lo a dep direta = ~zero superfície de supply-chain nova** — exceção quase-gratuita ao "evitar libs".

### 3.3. Branch escaneado — microserviço externo, lado Node 100% zero-dep

- OCR de imagem (Docling/PaddleOCR) é **Python/ML inevitável** → fica em **microserviço externo separado** atrás do port; o core-api segue Node-puro (ADR-0006/0002 — dependência de rede, não de runtime; mesmo padrão de S3/Bradesco/SES).
- Lado Node: **`fetch` nativo estável** (Node 24, undici — `handbook/reference/nodejs/Globals.md:540`) + `AbortSignal.timeout(30_000)` (`Globals.md:120`). Sem lib cliente (`axios`/`got` são o que o ADR-0011 manda substituir). **Atenção:** `fetch` **não rejeita em status HTTP de erro** — checar `res.ok` e mapear por status → `Result`.

### 3.4. Forma do port (validada)

```ts
type DocumentReaderPort = Readonly<{
  read: (input: DocumentReaderInput) => Promise<Result<DocumentReaderResult, DocumentReaderError>>;
}>;
```

Bate com `.claude/rules/application.md` ("Ports são `type` … `Readonly<{...}>` de funções"). Promise como seam, **sem `worker_threads`** (YAGNI — custo do nativo ~ `JSON.parse`; o adapter nativo pode ser síncrono por dentro, embrulhado em Promise). `DocumentReaderError` precisa de variantes: `decompression-limit-exceeded`, `source-too-large`, `ocr-timeout`, `scanned-unsupported`. `DocumentReaderResult` deve carregar `resolvedVia: 'xml' | 'native-text' | 'ocr-external'` (alimenta a trilha de auditoria, invariante cross-BC do ADR-0006).

---

## 4. LGPD, segurança e storage (F4) — corrige premissas e trava o design da borda

- **🔴 Infra real (correção):** produção é **AWS S3 `sa-east-1` (São Paulo/BR)** por `handbook/architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md`; **Magalu é só PBE/homolog** e o ADR **proíbe dado real/pessoal** lá (`:42`). Logo documento fiscal real → AWS BR → **residência BR já resolvida**; Magalu fora de cogitação para isso.
- **Cloud OCR = de facto BLOQUEADO.** RPA/boleto/NFS-e carregam **CPF/nome/endereço de pessoa física** → dado pessoal (LGPD art. 5). Free-tier **permanentemente proibido** (treina/revisão humana). Vertex/DocAI/Vision pagos = **condicional a TODOS**: DPA anti-treinamento + instrumento de transferência internacional (art. 33 / Res. CD/ANPD 19/2024) + base legal (art. 7) + RIPD (art. 38). **Nenhum existe hoje** → bloqueado na prática.
- **In-process + self-hosted = LGPD-safe por construção** (dado não sai do perímetro → a hipótese de "transferência" nem se aplica). Resíduos **MUST**: `OcrResult`/`DocumentReaderResult` = **campos, não texto bruto** (minimização, art. 6 III); **log nunca vaza bytes/texto/resultado** (redact do Pino cobre paths conhecidos, não `req.body` — `src/shared/http/app.ts:70`); retenção com prazo fiscal + expurgo.
- **🔴 Segurança que refina o port:** o desenho antigo `OcrPort.extract(pdfUrl: string)` (do SDD superado) **é vetor de SSRF**. **MUST:** o reader recebe **bytes** (ou uma storage-key resolvida server-side via `DocumentStorage.getContent`), **nunca URL de input do cliente**. Isso mata SSRF **e** evita vazar URL assinada para terceiro.
- **Borda de upload — reusar o precedente do `contracts`** (`src/modules/contracts/adapters/http/plugin.ts:125-167`): `application/octet-stream`→Buffer, `bodyLimit` por rota (não vazar o global de 1 MiB), **magic-bytes `%PDF-`** + allowlist Zod de mimeType (ADR-0027), sanitização de filename, `requireAuth`+`authorize(FINANCIAL_PERMISSION.write)`+ownership (IDOR). **Storage — reusar o port S3 do contracts** (bucket privado, signed URL de **minutos** não o teto de 7 dias, IAM Role em prod, VO `StorageKey`/`BucketName`).

---

## 5. Grounding DDD (F5) — o reader externo é um Anti-Corruption Layer

- **ACL (Evans, _DDD_, p.224):** _"New systems almost always have to be integrated with legacy or other systems, which have their own models. Translation layers can be simple… but when the other side of the boundary starts to leak through, the translation layer may take on a more defensive tone."_ → o adapter do OCR externo **traduz** o modelo do serviço de OCR para o `DocumentReaderResult` do `fin_`, blindando o domínio da tecnologia de OCR.
- **Ports & Adapters (Vernon, _IDDD_, p.182):** _"…output mechanisms… may also be diverse and swappable. That's possible because an Adapter is created to transform application results into a form accepted by a specific output mechanism."_ → `DocumentReaderPort` com **adapters trocáveis** (nativo / XML / microserviço escaneado) sem o domínio saber qual resolveu.

Isso **fecha o "Princípio IX pendente"** (citação canônica do port/ACL) que o SDD perdido nunca ancorou.

---

## 6. Reconciliação das direções — A (nativo-first) × B (OCR-engine)

| Critério                | **A — cascata nativo-first** (F1+F3)           | **B — OcrPort engine** (ADR-0034 / SDD antigo) |
| :---------------------- | :--------------------------------------------- | :--------------------------------------------- |
| Cobre a amostra da P.O. | **Sim, 100%** (parser nativo, CPU)             | Sim, mas via OCR pesado desnecessário          |
| LGPD                    | ✅ safe por construção                         | ⚠️ cloud bloqueado; self-hosted ok             |
| Custo                   | **~R$ 0** (CPU) no caminho principal           | GPU/infra ou custo/doc cloud                   |
| Licença                 | in-house / `unpdf` MIT / `fast-xml-parser` MIT | risco (mupdf AGPL, Qwen-3B research)           |
| Dependência externa     | zero no caminho principal                      | serviço/engine                                 |
| Go-live-safe / paralelo | ✅ in-process, determinístico                  | fase-1 mock ok, engine real depende de infra   |
| Alinhamento ADR         | precisa **1 ADR novo** refinando o 0034        | já no 0034                                     |

**Recomendação: A (cascata nativo-first).** B não é descartado — **ele É o degrau 3 (escaneado) da cascata A**: o "OCR engine" do ADR-0034 (agora PaddleOCR-VL/dots.ocr/Docling, não Tesseract/Textract — ver §7) é realizado como o **microserviço escaneado adiado**, atrás do mesmo port, self-hosted. Ou seja, A **contém** B como fallback — não há contradição com o ADR-0034; há um **refinamento** (ordem da cascata + nativo-first + LGPD) que merece um ADR que o supersede.

---

## 7. OCR self-hosted (fallback escaneado) — o estudo desatualizou levemente (F2)

Em 2026 os VLMs de OCR 0.9B superaram o Docling para invoice em hardware pequeno (benchmark OmniDocBench, opendatalab):

- **PaddleOCR-VL** (Apache-2.0, **~2 GB VRAM**) — melhor default leve + licença permissiva.
- **dots.ocr** (MIT, ~8 GB) — líder de acurácia (TEDS de tabela alto → menos erro em quantidade/valor).
- **GLM-OCR** (MIT, ~4 GB), **Unlimited-OCR** (MIT) — ultraleves alternativos.
- **MinerU** — relicenciado **AGPL→Apache** (abr/2026), ok agora.
- **Docling** (Apache-2.0, roda em CPU) — segue válido, mas não é mais claramente o melhor.
- **Armadilhas de licença:** **Qwen2.5-VL-3B = Research/não-comercial (evitar)**; **mupdf.js = AGPL (evitar)**.

**Ressalva de grounding (honesta):** números de acurácia/VRAM vêm de benchmarks/blogs de terceiros (2026) — bons para ordem de grandeza, **não normativos**. Antes de fixar o modelo no SDD: **POC local com amostra real** — e isso só entra se a % de escaneados (pergunta à P.O.) justificar.

---

## 8. Respostas às perguntas abertas das issues

- **#62 (ingestão via OCR):** o "OCR" real é uma **cascata de leitura** (XML → nativo → escaneado externo), não uma integração de OCR cloud. O port abstrai o fornecedor (ACL). ADR do provedor: **não é Tesseract/Textract** (ADR-0034 desatualizado) — é nativo-first + self-hosted no fallback.
- **#145 (extrato bancário PDF via OCR):** é **outro consumidor** do mesmo reader (normaliza para `fin_statement_transactions`), **fora desta fatia** — reusa o port depois. Não construir junto (YAGNI).
- **#290 (divergência de alíquota):** o **"esperado"** tem agora fonte programática oficial — **API "Parâmetros Municipais" do NFS-e Nacional** (alíquota por município + código de serviço), mas **cobertura parcial** → modelar como **tabela de config semeável pela API**, não hard-code. No XML da nota a alíquota **já vem declarada** → divergência = declarado × esperado. (Reforma tributária: LC 116 → NBS até ~2032.)
- **Pergunta à P.O. (a única que a pesquisa NÃO resolve):** **% real de documentos escaneados vs nativos.** Se baixo → o degrau escaneado é adiável (fatia futura); se alto → precisa do microserviço self-hosted no dia 1.

---

## 9. Implicações de design para a fatia-1 (a validar na spec/plan)

1. **Escopo fatia-1:** `DocumentReaderPort` + adapter **XML** (NFS-e/DANFE quando houver) + adapter **texto nativo** (PDF digital) + **mock** (testes). **Escaneado adiado** → adapter retorna `scanned-unsupported` (a menos que a P.O. diga que o volume exige já). Ingestão liga o `DocumentReaderResult` ao `Document` existente (pré-preenche rascunho; **humano confirma** — CA4 da #62).
2. **Menor-dependência:** tentar in-house PDF (após a varredura byte-level da amostra); **`fast-xml-parser` já-no-lockfile** para XML; **`fetch` nativo** para o microserviço. `unpdf` só se a varredura mostrar xref-stream onipresente.
3. **Segurança/LGPD travadas:** port recebe **bytes** (não URL); borda reusa o upload seguro do `contracts`; storage reusa o port S3 (`sa-east-1`, bucket privado, IAM Role); log sem conteúdo; `DocumentReaderResult` = campos (minimização).
4. **ADRs a abrir:** (a) **novo ADR** que supersede o `ADR-0034` (e o Proposed `specs/FIN-DOCUMENTO-INGESTAO/adr/0001`) com a **cascata nativo-first + racional LGPD + escaneado self-hosted**; (b) se adotar `unpdf`/promover `fast-xml-parser`, registrar no checklist ADR-0011 §5.

---

## 10. Decisões (resolvidas 2026-07-08 — dono delegou "mais correto | leve | rápido | sem perder qualidade")

1. **Direção = A (cascata nativo-first).** ✅ Resolvida — converge nas 5 fontes.
2. **% de escaneados (P.O.):** degrau escaneado **ADIADO** para fatia futura (adapter retorna `scanned-unsupported`). Fatia-1 = XML + nativo + mock. YAGNI — amostra P.O. 100% nativa; port já aceita o adapter escaneado depois.
3. **In-house PDF vs `unpdf`:** ✅ **varredura byte-level FEITA** na amostra real (2026-07-08). Resultado: docs fiscais BR = xref clássico + FlateDecode (node:zlib nativo), **`/Encrypt`=0, xref-stream+ObjStm só em 1 invoice não-fiscal**; só boletos precisam de CMap `/ToUnicode` (presente). **Decisão: in-house nativo, escopado ao observado, gated pela métrica 12/12-vs-gabarito + 0 alucinação (W0). `unpdf` (MIT) = fallback se não bater a métrica.**
4. **ADR novo:** ✅ **`ADR-0050` escrito (Proposed)** — supersede o 0034 com a cascata + racional LGPD + port recebe bytes (anti-SSRF). Aguarda aceite do Tech Lead (aceite → flip para Accepted + entrada no `handbook/CHANGELOG.md`).

### Métrica de aceite do reader (adotada do estudo do dono)

- **Correção:** 12/12 campos vs gabarito (NFS-e/RPA/Boleto) — 0 alucinação (nenhum valor fiscal errado silencioso).
- **Leve/rápido:** ~ms em CPU, 0 GPU, 0 dependência de runtime nova no caminho principal.
- **Qualidade:** fallback explícito (`unsupported-pdf-structure`/`scanned-unsupported`) — nunca valor errado silencioso.

> **Próximo:** `spec.md` + `plan.md` da fatia-1 (reader XML+nativo+mock), depois W0 (testes RED contra o gabarito). Sem código de produção antes do W0.

# FIN-DOC-READER-PDF-REAL — reader nativo de PDF funciona em documentos fiscais reais

> Bug #386 (épico OCR #62). Size **M**. Módulo `financial`. Fatia 1: **classificar + extrair best-effort**.

## Contexto / diagnóstico (reproduzido nos 7 PDFs reais da P.O., local/gitignored)

`createNativePdfDocumentReader().read()` falha em PDF fiscal real → rascunho vazio. Modos de falha:
- **`scanned-unsupported`** (DANFCOM ×2): o content-stream usa **só o operador `TJ`** (array, `[<hex>-N<hex>] TJ`, Identity-H) — `Tj=0, TJ=112`. O tokenizer (`native-pdf.ts:extractText`) **só trata `Tj`** → texto vazio.
- **`malformed-document`** (DamISS, NFSE_FILU, e um NF-e): texto extraído mas **fragmentado** (1 linha por `Tj`, `()Tj` vazios) → `detectType` (`:135-140`, só NFS-e/RPA/Boleto) não classifica ou as âncoras não casam.
- **OK parcial** (relatorio-2): classifica NFS-e mas valor/fornecedor não casam (fragmentação).

## Escopo (Fatia 1)

1. **Operador `TJ`** — `extractText` passa a extrair as strings (literal `(...)` e hex `<...>`) de arrays `[ ... ] TJ`, ignorando os números de kerning; join dentro do array sem quebra de linha (mesma run de texto).
2. **Reconstrução de linha** — usar operadores de posição (`Td`/`TD`/`T*`/`Tm`) para decidir quebras de linha (nova linha em mudança de Y), em vez de 1-linha-por-operador; runs na mesma linha unidas por espaço.
3. **`detectType` ampliado** — cobrir **DANFE/DANFCOM/NFC-e** (+ manter NFS-e/RPA/Boleto), mapeando para o enum `DocumentType`.
4. **Testabilidade** — expor a função de tokenização/extração (hoje privada) para teste unitário no nível de string (sem PDF plumbing, sem PII).

**Fora de escopo (follow-up):** extração exata por layout fiscal (cada layout difere); OCR de imagem (scanned) — diferido; NFSE_FILU (inflated=0, possível ObjStm) — investigar à parte se persistir após o fix.

## Critérios de aceite

- **CA1** — `extractText` extrai texto de content com operador **`TJ`** (array hex Identity-H + CMap `/ToUnicode`) — hoje retorna vazio.
- **CA2** — `extractText` **reconstrói linhas** por posição: runs consecutivos na mesma linha viram uma linha (espaço), `Td`/`Tm` com mudança de Y quebram — hoje fragmenta.
- **CA3** — `detectType` classifica **DANFE/DANFCOM** (texto sintético) — hoje `undefined`.
- **CA4** (local, gated) — rodando o reader nos **7 PDFs reais** (pasta gitignored): **nenhum** retorna `scanned-unsupported`/`malformed-document` e o `type` é detectado; extração de nº/valor/fornecedor best-effort (≥1 campo além do tipo na maioria). Teste **pula** se a pasta estiver vazia (CI sem os fixtures).

## Definition of Done
W0 RED → W1 GREEN → W2 APPROVED → W3 (typecheck + format:check + lint + test). Reader é puro (sem DB) → sem x99. Fixtures commitados = sintéticos (sem PII); reais só locais. Fatia 1 do #386.

# Phase 0 — Research: Geração de remessa CNAB 240 (Bradesco)

Decisões técnicas que resolvem os pontos do Technical Context. Cada decisão: **Decisão / Rationale / Alternativas**.

## D-ACL — Tradução CNAB via Anticorruption Layer (port + adapter)

- **Decisão**: O domínio expõe um `RemittanceOrder` limpo (cedente + lista de pagamentos: favorecido, valor, data, dados bancários). A tradução para CNAB 240 Bradesco (segmentos P/Q/J + header/trailer de arquivo e lote) é um **port** `CnabRemittanceTranslator` implementado por um adapter `bradesco-cnab240-translator.ts`. O domínio **nunca** vê posições/strings fixas (R3).
- **Rationale**: o BC Integração Bancária é explicitamente uma ACL + Open Host Service (`integracao-bancaria.md` §1, §8). Isola o formato; trocar/adicionar banco = nova "receita" sem tocar o core.
- **Alternativas**: gerar CNAB no domínio (rejeitado — vaza formato, ofende R3/Princípio V); biblioteca CNAB de terceiros (rejeitado por ora — supply-chain/ADR-0011 + guideline Bradesco específico local-only).
- ⚠️ **Princípio IX**: fronteira da ACL exige citação literal de Evans (cap. _Anticorruption Layer_ / _Open Host Service_) — **pendente** (MCP acdg off; anexar no gate).

## D-CEDENTE — Conta-cedente + `debitAccountRef` no documento

- **Decisão**: modelar `fin_cedente_accounts` (contas-débito Bradesco da org: agência, conta, dígito, convênio, CNPJ + contador NSA), seedável via config. O **documento ganha `debitAccountRef`** (de qual conta sai o pagamento). A geração **agrupa os títulos selecionados por `debitAccountRef`** → 1 lote por conta. Se a org tiver só uma conta configurada e o documento não tiver `debitAccountRef`, usa a conta default.
- **Rationale**: a clarify travou "múltiplas contas → 1 lote por conta na mesma geração" (spec §Clarifications). Agrupar exige saber a conta de cada título; o modelo atual (Fatia 1-2) não tem esse vínculo (Explore confirmou: cedente não existe). É a **decisão de maior escopo** da fatia.
- **Alternativas**: (a) operador passa a conta como parâmetro e gera 1 remessa por chamada — rejeitado (contradiz "agrupar por conta numa geração"); (b) conta via env única — rejeitado (não atende múltiplas contas).
- **Impacto**: `save-document`/`adjust-document` passam a aceitar `debitAccountRef` (opcional, default = conta única). Detalhar no ticket `FIN-REMITTANCE-PERSIST`.

## D-HASH — Checksum SHA-256 sobre o blob persistido

- **Decisão**: hash = SHA-256 (`node:crypto`) do conteúdo do arquivo, calculado no momento do upload; armazenado no `StorageRef.hashSha256` (reusa o VO do molde `contracts`) e espelhado em `fin_remittances.hash`.
- **Rationale**: R2 (integridade); SHA-256 é o padrão do `StorageRef` já existente no `contracts` (`document-storage.types.ts`). Zero dependência nova.
- **Alternativas**: CRC/MD5 (rejeitado — fraco p/ integridade); hash do domínio antes do storage (equivalente; preferimos sobre o blob persistido p/ detectar adulteração pós-escrita).

## D-NSA — Numeração sequencial por conta-cedente

- **Decisão**: contador persistido por conta em `fin_cedente_accounts.next_nsa`; alocação via `SELECT ... FOR UPDATE` + `UPDATE` na mesma transação da geração. Monotônico, nunca reutilizado (mesmo em falha pós-alocação).
- **Rationale**: o header de arquivo/lote CNAB exige NSA; Bradesco rastreia por conta/convênio. `FOR UPDATE` evita corrida (geração concorrente). MySQL não tem sequences nativas (ADR-0020) → contador em linha.
- **Alternativas**: `MAX(nsa)+1` por conta (rejeitado — corrida sem lock); UUID (rejeitado — CNAB exige numérico sequencial).

## D-STORAGE — Reuso do molde DocumentStorage no financial

- **Decisão**: copiar o port `DocumentStorage` + tipos (`BucketName`, `StorageKey`, `StorageRef`) do `contracts` para `financial/application/ports/` + adapters `in-memory` e `s3` (`@aws-sdk/client-s3`, ADR-0019). Bucket/prefixo: `…/financial/remessas/…`.
- **Rationale**: ADR-0006 proíbe importar adapter de outro módulo; copiar o molde mantém isolamento. ADR-0019 fixa `@aws-sdk/client-s3` único.
- **Alternativas**: extrair p/ `shared/` (rejeitado por ora — YAGNI; só 2 consumidores, refatorar p/ shared quando houver 3º — regra "se 2+ módulos usam, sobe pro shared", a avaliar em fatia futura).

## D-EVENTS — Eventos `RemittanceGenerated` + `DocumentTransmitted`

- **Decisão**: `RemittanceGenerated` (por lote: remittanceId, debitAccountRef, nsa, hash, storageRef, documentIds, occurredAt) e `DocumentTransmitted` (por documento: documentId, remittanceId, occurredAt). EN-passado, no `financial/domain/document/events.ts` + `remittance/events.ts`, expostos em `public-api/events.ts` (schema v1, aditivo). `append` no outbox do financial.
- **Rationale**: segue o padrão EN-passado existente (`DocumentSaved`, `PayableApproved` — Explore §5) e o ADR-0015 (outbox). `ArquivoRemessaGerado`/`TituloTransmitido` da spec (PT, nomes de negócio) mapeiam para esses identificadores EN.
- **Alternativas**: um único evento agregando tudo (rejeitado — granularidade por documento é útil p/ consumidores e p/ a sub-fatia de retorno).

## D-ATOMICIDADE — Domínio atômico; blob antes do commit

- **Decisão**: fluxo do use case: validar seleção → agrupar por conta → para cada conta: montar `RemittanceOrder` → traduzir (ACL, puro) → **upload do blob** ao storage (fora da tx) → numa **única transação** cobrindo todas as contas: alocar NSA (`FOR UPDATE`), inserir `fin_remittances`/`fin_remittance_items`, transicionar documentos `Approved→Transmitted`, `append` outbox. Se a tradução/upload falhar antes da tx → aborta sem efeito. Se a tx falhar → blobs ficam órfãos no storage (inócuos; limpeza best-effort), **nenhum** estado de domínio muda (FR-011).
- **Rationale**: storage S3 não participa de tx MySQL; a consistência forte vive no domínio (estados + lotes). Blob órfão não referenciado é inofensivo.
- **Alternativas**: upload depois do commit (rejeitado — lote registrado sem arquivo é pior que blob órfão); 2-phase commit (rejeitado — overkill/ADR-0015 já assume at-least-once).

## Resolução de NEEDS CLARIFICATION

Nenhum `[NEEDS CLARIFICATION]` permanece no Technical Context — todos resolvidos acima. Layout exato dos campos dos segmentos P/Q/J é detalhe do adapter (ticket `FIN-CNAB-ACL`), guiado pelo guideline local-only.

## Pendência de processo (Princípio IX)

Decisões D-ACL (fronteira ACL/agregado) e D-CEDENTE/D-EVENTS exigem **citação canônica literal ≥4 linhas** (Evans — ACL/OHS; Vernon — Aggregates; Newman — integração por eventos). MCP `acdg-skills` **off** nesta sessão e sem fallback local → anexar as citações antes do gate W3 das decisões. **Não bloqueia o plano**; é requisito de fechamento.

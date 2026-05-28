# 📋 Relatório de decisão — Transporte de bytes no upload de documentos (C3)

> **Status:** ✅ **DECIDIDO (2026-05-28, Gabriel): Opção D — raw octet-stream.** Sessão de design entre 6
> agentes especialistas. Este doc consolida os 6 pareceres e a decisão. B/C descartados do C3 (ver §"Convergências").
> A SPEC do C3 (`001-spec/SPEC.md`) implementa a Opção D + os MUSTs de segurança listados aqui.

## A pergunta

`POST /api/v2/contracts/:id/documents` precisa levar os bytes do documento do cliente até o storage
S3/MinIO (ADR-0019). O use case `uploadDocument` recebe `bytes: Uint8Array` → `DocumentStorage.upload`.
`@fastify/multipart` não está instalado. Quatro opções:

- **A — base64 no JSON** (`contentBase64`, Zod valida, decode em memória).
- **B — multipart/form-data** via `@fastify/multipart` (nova dependência).
- **C — presigned URL** (backend assina URL; cliente faz PUT direto ao S3; backend registra metadados).
- **D — raw octet-stream** (`application/octet-stream` + `addContentTypeParser`; metadados via query/header).

## Matriz de pareceres (6 especialistas)

| Eixo (agente) | A base64 | B multipart | C presigned | D raw |
| :-- | :--: | :--: | :--: | :--: |
| **Segurança** (security-backend) | 🔴 pior (amplificação 33%, DoS, eleva bodyLimit global) | 🟡 ok (mas supply-chain) | 🟡 SSRF/CORS/integridade | 🟢 **1º** (bodyLimit cirúrgico, sem JSON-parse) |
| **Supply-chain** (pnpm) | 🟢 zero dep | 🔴 **rejeita** (5+ deps, ADR-0011; alvo) | 🟢 zero dep | 🟢 zero dep |
| **Runtime/heap** (nodejs) | 🔴 pior (≈3,4× heap, JSON.parse bloqueia) | 🟡 buffer total | 🟢 **1º** (bytes fora do Node) | 🟢 2º |
| **Integridade dados** (mysql) | 🟢 baixo risco | 🟢 **1º** (INSERT após PUT) | 🔴 registro órfão / hash não-verificável | 🟢 baixo risco |
| **Atomicidade ORM** (drizzle) | 🟢 neutro | 🟢 **1º** (fluxo atual intacto) | 🔴 **quebra ADR-0015** (PUT fora da tx) | 🟢 neutro |
| **Zod-contract-first** (fastify) | 🟢 **1º** (Zod valida body inteiro + OpenAPI auto) | 🔴 quebra ADR-0027 | 🟡 ok (2 rotas JSON) | 🟡 body fora do type-provider |

## Convergências fortes (eliminatórias)

1. **B (multipart) sai** — colide com **dois** ADRs: ADR-0011 (supply-chain — pnpm rejeita `@fastify/multipart`
   + busboy transitivo; exigiria ADR de exceção) e ADR-0027 (multipart não valida via Zod automaticamente,
   exige validação manual + OpenAPI manual). Ironicamente é a preferida de mysql/drizzle pela atomicidade —
   mas essa mesma atomicidade é igualmente preservada por A e D.

2. **C (presigned) sai do MVP** — colide com **ADR-0015** (o PUT do cliente acontece fora da
   `db.transaction` que garante `documento + evento-outbox` atômicos) e exige: refatorar o port
   `DocumentStorage` (anchor do ADR-0019), status `PendingUpload` no schema (migration + CHECK + índice),
   job de GC de órfãos, validação de hash via S3 Checksum API, e CORS no bucket + coordenação com o BFF.
   É **evolução futura** (quando volume/tamanho justificar), com ADR dedicado — não cabe no C3 (M).

→ **Restam A e D.** Ambas: zero dependência, bytes passam pelo Node, fluxo `upload → save` e a
atomicidade do outbox **preservados** (mysql/drizzle neutros para as duas).

## A escolha real: A vs D

| | **A — base64-JSON** | **D — raw octet-stream** |
| :-- | :-- | :-- |
| Validação Zod do corpo | ✅ **automática, body inteiro** (ADR-0027 puro) | ⚠️ metadados (query/header) via Zod; **bytes fora** do type-provider |
| OpenAPI | ✅ gerado (`string/base64`) | ⚠️ `format: binary`, geração assistida |
| Dependência nova | ✅ nenhuma | ✅ nenhuma |
| Overhead de wire | 🔴 +33% | ✅ nenhum |
| Heap por upload (1 MiB) | 🔴 ~3,4 MiB (string JSON + string b64 + buffer) | ✅ ~1 MiB |
| Event loop | 🔴 `JSON.parse` de string grande bloqueia | ✅ sem JSON-parse |
| `bodyLimit` | 🔴 elevar afeta **todas** as rotas (ou parser JSON dedicado, frágil) | ✅ **cirúrgico por parser** (global 1 MiB intacto) |
| Segurança (DoS/integridade) | 🔴 pior | ✅ melhor |
| Tamanho viável | só pequenos (~750 KB no limite atual) | PDFs de contrato (1–20 MiB) com limite por rota |
| Aderência ao padrão do projeto | ✅ idêntico às outras rotas | ⚠️ 1ª rota com `addContentTypeParser` |

**MUSTs comuns a A e D** (security-backend): `authorize('contract:write')` + checagem de ownership (IDOR);
`fileName` regex anti-traversal antes do VO `createStorageKey`; `mimeType` allowlist (`z.enum`); **magic
bytes** vs mimeType declarado; não logar bytes; rate-limit específico de upload.

## Recomendação (síntese do orquestrador)

**D (raw octet-stream)** como escolha primária. Racional: para documentos contratuais (PDFs assinados,
1–20 MiB), os eixos de **segurança** e **runtime** — onde A é o pior — pesam mais que a pureza do
contrato Zod, e D **vence segurança e fica em 2º no runtime sem dependência nova**, com `bodyLimit`
cirúrgico que preserva o limite global de 1 MiB do resto da API. A objeção do fastify-expert (body fora do
type-provider Zod) é real mas de baixo impacto: o corpo são **bytes opacos** — não há semântica para o Zod
validar além de tamanho e magic-bytes, que são checagens imperativas em qualquer opção; **os metadados
(fileName, mimeType, categoria) continuam validados por Zod** via query/params, e o OpenAPI documenta o
corpo como `format: binary` (vocabulário correto em 3.1.1).

**A (base64-JSON)** é a alternativa defensável **se** a prioridade for pureza máxima do contrato
Zod/OpenAPI **e** os documentos forem comprovadamente pequenos — aceitando o custo de heap/DoS com
mitigações (bodyLimit por rota, `maxLength` no schema, magic-bytes pós-decode).

**B e C** não no C3 (B: 2 ADRs contra; C: ADR-0015 + refactor de port + ADR próprio → backlog de evolução).

## Pareceres na íntegra

Os 6 relatórios completos (com citações de arquivo:linha) estão no histórico da sessão de 2026-05-28
(transcript do ticket C3). Resumo dos vereditos individuais:
`security-backend → D` · `pnpm → C (senão D)` · `nodejs → C p/ grandes, D fallback` · `mysql → B (C exige
pré-condições)` · `fastify → A` · `drizzle → B (C exige ADR)`.

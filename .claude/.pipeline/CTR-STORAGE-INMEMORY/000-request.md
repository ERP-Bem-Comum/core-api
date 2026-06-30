# 000 — Request CTR-STORAGE-INMEMORY

> **Primeiro adapter concreto do port `DocumentStorage` (entregue em `CTR-STORAGE-PORT` ✅).**
> Adapter InMemory para tests unitários e de contrato dos use cases. Pré-requisito de `CTR-STORAGE-S3-ADAPTER` (ticket #2) — testes da suite contratual rodam contra InMemory antes do S3 real existir.
> Implementa [ADR-0019](../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) §"Topologia de execução" linha "Testes unitários / contrato → Adapter InMemory".

## Justificativa

`CTR-STORAGE-PORT` (#1) entregou o contrato (`DocumentStorage` port + `BucketName`/`StorageKey`/`StorageRef` types). Faltam os adapters:

- **InMemory (este ticket)** — para tests dos use cases + tests de contrato (suite paramétrica que vai rodar contra InMemory e S3 real)
- **S3 real (ticket #2)** — `@aws-sdk/client-s3` configurável (AWS + MinIO + Magalu)
- **Magalu config (ticket #3)** — config builder específico

Sem InMemory:

- Use cases que dependem de `DocumentStorage` (futuro `uploadDocument`, refator de `attachSignedDocument` para validar disponibilidade — ADR-0019 §"Tickets gerados" #7/#8) não podem ser testados sem subir MinIO via Docker.
- A **suite paramétrica de contrato** (`document-storage.contract.ts`, padrão já usado em `contract-repository.suite.ts`) não pode existir sem ao menos uma implementação que rode em `pnpm test` default.

## Decisões fixadas neste ticket

- **Persistência via `Map<string, StoredBlob>`** — chave concatenada `${bucket}/${key}` para evitar colisões entre buckets. `StoredBlob` carrega `bytes: Uint8Array` + `mimeType: string` + `hashSha256: string` (calculado no upload).
- **Hash SHA-256 via `node:crypto`** — `createHash('sha256').update(bytes).digest('hex')`. Calculado no `upload()` antes de armazenar. Se `expectedSha256` foi fornecido e não bater, retorna `'storage-integrity-mismatch'`.
- **`signedUrl()` retorna URL fake** — formato `https://in-memory.local/{bucket}/{key}?expires={ISO-8601}`. TTL validado contra `(0, 604800]` (ADR-0019 espelha AWS V4: máx 7 dias) — fora dessa faixa retorna `'storage-invalid-ttl'`. **Não há lógica de expiração real** (InMemory não tracking TTL); o objetivo é apenas testar que use cases que pedem signed URL recebem URL bem-formada.
- **`exists()` e `download()` retornam `'storage-not-found'`** se a chave composta não está no Map.
- **Helpers de teste** — `getAllBlobs()`, `clear()`, `size()`. Padrão "observable test double" alinhado com `InMemoryEventBus` e `createInMemoryEmailSender`.
- **Factory pura sem efeito top-level** — `createInMemoryDocumentStorage(): InMemoryDocumentStorage`. Map criado dentro do closure.
- **Imutabilidade no domínio**: o adapter **clona** os bytes na entrada (defensive copy via `Uint8Array.from`) e na saída — adapter consome um snapshot, retorna um snapshot. Garante que mutação no caller não corrompe o store. `download()` também retorna cópia.
- **Smart constructors do port (`createBucketName`, `createStorageKey`, `createStorageRef`) NÃO são chamados pelo adapter** — adapter recebe valores já validados (são branded types). Adapter apenas storage.

## Escopo

### 1. `src/modules/contracts/adapters/storage/in-memory.ts`

```ts
import { createHash } from 'node:crypto';

import { type Result, ok, err } from '../../../../shared/result.ts';
import type {
  DocumentStorage,
  DocumentStorageError,
  UploadInput,
} from '../../application/ports/document-storage.ts';
import type {
  BucketName,
  StorageKey,
  StorageRef,
} from '../../application/ports/document-storage.types.ts';

export type InMemoryDocumentStorage = DocumentStorage &
  Readonly<{
    /** Total de blobs armazenados (todos os buckets somados). */
    size: () => number;
    /** Limpa todos os blobs. Útil entre tests. */
    clear: () => void;
    /** Snapshot read-only de todos os blobs (para asserts de tests). */
    getAllBlobs: () => readonly Readonly<{
      bucket: BucketName;
      key: StorageKey;
      bytes: Uint8Array;
      mimeType: string;
      hashSha256: string;
    }>[];
  }>;

export const createInMemoryDocumentStorage = (): InMemoryDocumentStorage => {
  // ...
};
```

### 2. `tests/modules/contracts/adapters/storage/in-memory.test.ts`

Cobre o adapter InMemory diretamente (sem usar a suite contratual ainda — suite vem no ticket #2).

Cenários:

- **CA-T1** — `upload(...)` valido → `ok(StorageRef)` com `bucket`, `key`, `mimeType`, `sizeBytes = bytes.length`, `hashSha256` em hex lowercase 64 chars.
- **CA-T2** — `upload(...)` + `download(ref)` → `ok(Uint8Array)` com mesmos bytes (cópia, não referência).
- **CA-T3** — `upload(...)` com `expectedSha256` divergente → `err('storage-integrity-mismatch')`. Blob NÃO armazenado.
- **CA-T4** — `download(ref)` para chave inexistente → `err('storage-not-found')`.
- **CA-T5** — `exists(ref)` retorna `ok(true)` após upload, `ok(false)` para chave inexistente.
- **CA-T6** — `signedUrl(ref, 3600)` → `ok(URL)` formato `https://in-memory.local/{bucket}/{key}?expires=...`.
- **CA-T7** — `signedUrl(ref, 0)` → `err('storage-invalid-ttl')` (faixa válida é `(0, 604800]`).
- **CA-T8** — `signedUrl(ref, 604801)` → `err('storage-invalid-ttl')` (máx 7 dias).
- **CA-T9** — Bytes do caller mutados pós-upload NÃO afetam blob armazenado (defensive copy entrada).
- **CA-T10** — Bytes retornados por `download()` mutados NÃO afetam blob armazenado (defensive copy saída).
- **CA-T11** — `getAllBlobs()` retorna snapshot read-only após múltiplos uploads.
- **CA-T12** — `clear()` zera `size()` e `getAllBlobs()`.
- **CA-T13** — Smoke type-level: `createInMemoryDocumentStorage()` é assignable a `DocumentStorage` (port).

### 3. `src/modules/contracts/public-api/index.ts`

Adapter InMemory **NÃO é exposto no public-api**. Mantém padrão do `notifications/public-api/index.ts` (CA4 do ticket anterior): InMemory é detalhe interno para tests do próprio módulo + suite contratual. Consumers externos ao módulo Contracts importam `createS3DocumentStorage` (ticket #2) via public-api.

### 4. ASCII puro nos arquivos novos

Conforme lição da série Pipeline Tooling. Aplica a `in-memory.ts` + `in-memory.test.ts`.

## Critérios de aceitação

- **CA1** — `src/modules/contracts/adapters/storage/in-memory.ts` exporta `createInMemoryDocumentStorage(): InMemoryDocumentStorage` (factory pura, sem efeito top-level).
- **CA2** — `InMemoryDocumentStorage = DocumentStorage & Readonly<{ size, clear, getAllBlobs }>`. Type-level smoke garante que satisfaz o port.
- **CA3** — Hash SHA-256 calculado via `node:crypto.createHash('sha256').update(bytes).digest('hex')`. Resultado em lowercase 64 chars (regex `/^[0-9a-f]{64}$/`).
- **CA4** — `upload()` com `expectedSha256` divergente retorna `'storage-integrity-mismatch'` e NÃO armazena.
- **CA5** — `signedUrl()` retorna URL bem-formada `https://in-memory.local/{bucket}/{key}?expires=<ISO-8601>`. TTL fora de `(0, 604800]` retorna `'storage-invalid-ttl'`.
- **CA6** — Defensive copy em entrada e saída — mutação dos bytes pelo caller (antes ou depois) NÃO afeta o blob armazenado.
- **CA7** — Helpers de teste (`size`, `clear`, `getAllBlobs`) cumprem o padrão "observable test double" (alinhado com `InMemoryEventBus` e `createInMemoryEmailSender`).
- **CA8** — 13 tests unitários (CA-T1..T13) verdes em `pnpm test`. Sem rede, sem Docker.
- **CA9** — `try/catch` zero — adapter InMemory não tem boundary com infra real. Apenas validações lógicas retornando `Result`.
- **CA10** — Gates W3 verdes (typecheck/format/lint/test).
- **CA11** — ASCII puro nos arquivos novos.
- **CA12** — Public-api do módulo contracts NÃO exporta o adapter InMemory nem o factory (decisão I2 herdada do notifications).
- **CA13** — Não toca `application/ports/document-storage.ts` nem `document-storage.types.ts` (estão fechados desde `CTR-STORAGE-PORT`).

## Não-objetivos

- **Suite contratual paramétrica** (`document-storage.contract.ts`) — fica para ticket #2, quando houver 2ª implementação (S3) para validar contra. Adicionar suite agora com 1 implementação é overhead.
- **Adapter S3 real** — ticket #2 (`CTR-STORAGE-S3-ADAPTER`).
- **Config builder Magalu Cloud** — ticket #3 (`CTR-STORAGE-MAGALU-CONFIG`).
- **Use case `uploadDocument`** — ADR-0019 §"Tickets gerados" #7. Depende deste + ticket #2 + agregado `DocumentoContratual` (#6 do ADR).
- **Tracking de TTL real / expiração de signedUrl** — InMemory não simula expiração temporal. URL apenas precisa estar bem-formada para tests dos use cases.
- **Lifecycle / Object Lock / Versioning** — específicos do adapter real S3.
- **Documentos vinculados ao agregado `Amendment`** — depende do agregado `DocumentoContratual` (ticket separado no ADR).

## Risco / pontos de atenção

1. **`Uint8Array` em `DocumentStorage.upload` não tem `readonly` nativo** — o port comenta isso (`document-storage.ts:30-35`). Adapter aceita `bytes: Uint8Array` e faz defensive copy via `Uint8Array.from(input.bytes)`. Tests CA-T9 e CA-T10 validam.
2. **Tamanho de bytes** — `sizeBytes = bytes.length` (não `byteLength`). Mesma coisa para `Uint8Array` mas explicitar para evitar confusão com `Buffer.byteLength` (que conta bytes UTF-8 em strings, semântica diferente).
3. **Decisão de `expectedSha256` comparison** — case-insensitive ou exato? Decisão: **exato** (lowercase hex). `StorageRefError` `'storage-ref-invalid-hash'` já enforça lowercase no port via `SHA256_LOWER_HEX = /^[0-9a-f]{64}$/`. Caller que passa hash em uppercase recebe mismatch — comportamento documentado nos tests.
4. **Bug #47936 (sub-agent interruption):** size S, baixo risco. Workflow direto via main-session.
5. **Idempotência de upload com mesma chave** — InMemory atualmente sobrescreve. Padrão S3 default também sobrescreve. Documentado nos tests (CA-T1 — re-upload da mesma chave atualiza). Object Lock/Versioning ficam para o adapter real.

## Próximos tickets na frente Storage

| # | Ticket | Size | Status |
| :--- | :--- | :---: | :--- |
| ✅ | `CTR-STORAGE-PORT` | — | closed (port + types) |
| **#1 (este)** | **`CTR-STORAGE-INMEMORY`** | **S** | **open** |
| #2 | `CTR-STORAGE-S3-ADAPTER` | M | pending (depende deste — suite contratual) |
| #3 | `CTR-STORAGE-MAGALU-CONFIG` | S | pending (depende de #2) |
| #4 | `CTR-STORAGE-COMPOSE` | XS | pending (MinIO no docker compose, talvez já exista) |
| #5 | `CTR-DOCUMENT-AGGREGATE` | M | pending (agregado + schema Drizzle) |
| #6 | `CTR-USECASE-UPLOAD-DOCUMENT` | M | pending (use case que orquestra upload) |

# 002 - W0 (RED) - CTR-STORAGE-INMEMORY

**Skill:** tdd-strategist
**Data:** 2026-05-22
**Veredito:** RED CONFIRMADO - `pass=0, fail=1`. Causa:

- `src/modules/contracts/adapters/storage/in-memory.ts` nao existe (`ERR_MODULE_NOT_FOUND`).

---

## Arquivo criado

| Arquivo | Cenarios | CA cobertos |
| :--- | ---: | :--- |
| `tests/modules/contracts/adapters/storage/in-memory.test.ts` | 13 | CA-T1..CA-T13 |

---

## Intencao de cada teste

| ID | O que valida |
| :-- | :-- |
| CA-T1 | `upload(...)` valido retorna `ok(StorageRef)` com `bucket`, `key`, `mimeType`, `sizeBytes`, `hashSha256` (lowercase hex 64 chars, igual a `createHash('sha256').update(bytes).digest('hex')`) |
| CA-T2 | `upload` + `download` retorna `ok(Uint8Array)` com mesmos bytes |
| CA-T3 | `upload` com `expectedSha256` divergente retorna `'storage-integrity-mismatch'` e `storage.size()` permanece 0 |
| CA-T4 | `download(refPhantasma)` retorna `'storage-not-found'` |
| CA-T5 | `exists(ref)` retorna `ok(true)` apos upload, `ok(false)` para chave inexistente |
| CA-T6 | `signedUrl(ref, 3600)` retorna `ok(URL)` com `protocol='https:'`, `hostname='in-memory.local'`, `pathname='/{bucket}/{key}'`, query `expires` matching ISO-8601 |
| CA-T7 | `signedUrl(ref, 0)` retorna `'storage-invalid-ttl'` |
| CA-T8 | `signedUrl(ref, 604801)` retorna `'storage-invalid-ttl'` (cap AWS V4 = 7 dias = 604800s) |
| CA-T9 | Mutar `bytes` do caller pos-upload NAO altera blob armazenado (defensive copy entrada) |
| CA-T10 | Mutar `value` retornado por `download()` NAO altera blob armazenado (defensive copy saida) |
| CA-T11 | `getAllBlobs()` retorna snapshot com todos os blobs apos multiplos uploads |
| CA-T12 | `clear()` zera `size()` e `getAllBlobs().length` |
| CA-T13 | Smoke type-level - `createInMemoryDocumentStorage()` e assignable a `DocumentStorage` (port) |

---

## Constraints e decisoes herdadas para W1

### 1. Signature do factory

```ts
export const createInMemoryDocumentStorage = (): InMemoryDocumentStorage => { /* ... */ };
```

Factory pura: sem efeito top-level, sem leitura de env. Map criado dentro do closure.

### 2. Type `InMemoryDocumentStorage`

```ts
export type InMemoryDocumentStorage = DocumentStorage &
  Readonly<{
    size: () => number;
    clear: () => void;
    getAllBlobs: () => readonly Readonly<{
      bucket: BucketName;
      key: StorageKey;
      bytes: Uint8Array;
      mimeType: string;
      hashSha256: string;
    }>[];
  }>;
```

Helpers `size`, `clear`, `getAllBlobs` cobertos por CA-T11/T12.

### 3. Hash SHA-256

`node:crypto.createHash('sha256').update(bytes).digest('hex')` - resultado em lowercase, 64 chars.

CA-T1 compara o hash retornado contra o calculado pelo proprio teste via `node:crypto`. CA-T3 usa um hash sintetico `'deadbeef'.repeat(8)` que NAO bate com `sha256('Hello')`.

### 4. Formato da `signedUrl`

`https://in-memory.local/{bucket}/{key}?expires=<ISO-8601>`.

Bucket fixture: `'contracts-documents'`. Key fixture: `'contracts/abc-123/file.pdf'`.

Pathname concatenado: `/contracts-documents/contracts/abc-123/file.pdf`. CA-T6 valida.

### 5. Faixa valida de TTL

`(0, 604800]`. CA-T7 (`0`) e CA-T8 (`604801`) devem cair em `'storage-invalid-ttl'`.

### 6. Defensive copy

- **Entrada (`upload`):** clone `bytes` antes de armazenar - `Uint8Array.from(input.bytes)` ou equivalente. CA-T9 muta o array original pos-upload e espera ler bytes originais via `download`.
- **Saida (`download`):** clone novamente antes de retornar. CA-T10 muta a copia retornada e espera ler bytes originais no proximo `download`.

Estrategia recomendada para W1: armazenar `Uint8Array.from(bytes)` no Map; retornar `Uint8Array.from(stored)` no download.

### 7. Chave composta do Map

Recomendado: `${bucketName}/${storageKey}` ou objeto `{ bucket, key }` com `Map<string, Blob>`. Implementacao livre; tests validam comportamento, nao detalhe interno.

### 8. ASCII puro

Conforme licao da serie Pipeline Tooling. Aplica a `in-memory.ts`.

### 9. Public-api do modulo contracts NAO deve exportar o adapter

Decisao I2 herdada do notifications. CA12. Adapter InMemory e detalhe interno - importavel apenas em tests via `#src/modules/contracts/adapters/storage/in-memory.ts`.

---

## Saida do runner

```
node --test --experimental-strip-types --no-warnings tests/modules/contracts/adapters/storage/in-memory.test.ts

(node:NN) ExperimentalWarning: Type Stripping is an experimental feature
...
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'/Users/gabriel_aderaldo/.../src/modules/contracts/adapters/storage/in-memory.ts'
  ...
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///.../src/modules/contracts/adapters/storage/in-memory.ts'

i tests 1
i suites 0
i pass 0
i fail 1
i cancelled 0
i skipped 0
i todo 0
i duration_ms 85.701958
```

**Por que `tests=1` em vez de 13:** padrao recorrente do `node:test` - o import top-level quebra antes do `describe()` rodar; o runner reporta o arquivo inteiro como 1 fail unitario. Em W1 (apos criar `in-memory.ts`), os 13 cenarios virao a tona individualmente.

---

## Veredito W0

RED confirmado. 13 cenarios descritos cobrindo todos os 13 CA do request. ASCII puro. Sem rede, sem Docker - tests rodam em `pnpm test` default.

Proxima wave: **W1 - GREEN** implementando `createInMemoryDocumentStorage` em `src/modules/contracts/adapters/storage/in-memory.ts`.

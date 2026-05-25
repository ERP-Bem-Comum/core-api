# 002 - W0 (RED) - CTR-STORAGE-S3-ADAPTER

**Skill:** tdd-strategist
**Data:** 2026-05-22
**Veredito:** RED CONFIRMADO - `pass=22, fail=3`. Causas:

- `src/modules/contracts/adapters/storage/s3-config-aws.ts` nao existe (`ERR_MODULE_NOT_FOUND`)
- `src/modules/contracts/adapters/storage/s3-error-mapper.ts` nao existe
- `src/modules/contracts/adapters/storage/s3.ts` nao existe + `@aws-sdk/client-s3` ainda nao instalado

**Bonus:** a suite contratual paramétrica `runDocumentStorageContract('in-memory', ...)` ja roda contra o adapter InMemory entregue em #1 e passou todos os 8 CA-C* (validacao implicita de que a suite esta bem escrita).

---

## Arquivos criados

| Arquivo | Tipo | CA cobertos |
| :--- | :--- | :--- |
| `tests/modules/contracts/adapters/storage/document-storage.contract.ts` | Suite paramétrica (`.contract.ts` — não roda direto) | CA-C1..C8 (cenarios comuns agnosticos) |
| `tests/modules/contracts/adapters/storage/s3-config-aws.test.ts` | Tests unit | CA-T15..T22 (config builder + parser env) |
| `tests/modules/contracts/adapters/storage/s3-error-mapper.test.ts` | Tests unit | CA-T23..T30 (error mapper, 7 buckets + nao-Error) |
| `tests/modules/contracts/adapters/storage/s3.integration.test.ts` | Tests integration guarded `STORAGE_INTEGRATION=1` | CA-C1..C8 contra MinIO real |
| **Total novos** | **4 arquivos** | **CA-C1..C8 + CA-T15..T30** |

## Arquivo modificado

| Arquivo | Mudanca |
| :--- | :--- |
| `tests/modules/contracts/adapters/storage/in-memory.test.ts` | + import de `runDocumentStorageContract` + chamada `runDocumentStorageContract('in-memory', ...)` antes do describe existente. Os 14 CAs específicos (CA-T1..T14) ficam intactos. |

---

## Mapa dos cenarios

### Suite contratual (CA-C1..C8) — agnostica de implementacao

| ID | Cenario |
| :-- | :-- |
| CA-C1 | `upload(...)` valido retorna `ok(StorageRef)` com `bucket`, `sizeBytes`, `hashSha256` (lowercase hex 64) batendo `createHash('sha256')`, `mimeType` |
| CA-C2 | `upload` + `download` round-trip — bytes identicos |
| CA-C3 | `upload` com `expectedSha256` divergente retorna `'storage-integrity-mismatch'` |
| CA-C4 | `download` de chave inexistente retorna `'storage-not-found'` |
| CA-C5 | `exists` retorna `ok(true)` apos upload, `ok(false)` para inexistente |
| CA-C6 | `signedUrl(ref, 3600)` retorna `ok(URL)` com `protocol ∈ {http:, https:}` (forma generica — host varia por adapter) |
| CA-C7 | `signedUrl(ref, 0)` retorna `'storage-invalid-ttl'` |
| CA-C8 | `signedUrl(ref, 604801)` retorna `'storage-invalid-ttl'` (>7 dias, cap AWS V4) |

### Tests unit `awsS3Config` + `parseAwsS3Env` (CA-T15..T22)

| ID | Cenario |
| :-- | :-- |
| CA-T15 | `parseAwsS3Env` com env valido completo retorna ok; defaults: `endpoint = https://s3.<region>.amazonaws.com`, `forcePathStyle=false` |
| CA-T16 | `S3_ENDPOINT='http://localhost:9000'` → `forcePathStyle=true` inferido |
| CA-T17 | `S3_FORCE_PATH_STYLE='true'` override explicito |
| CA-T18 | `S3_REGION` ausente → `err missing-env field=S3_REGION` |
| CA-T19 | `S3_BUCKET` ausente → `err missing-env field=S3_BUCKET` |
| CA-T20 | `S3_ACCESS_KEY_ID` ausente → `err missing-env field=S3_ACCESS_KEY_ID` |
| CA-T21 | `S3_BUCKET='UPPERCASE-INVALID'` → `err invalid-bucket` (delegando para `createBucketName`) |
| CA-T22 | `awsS3Config(input)` direto com `endpoint='http://localhost:9000'` → `forcePathStyle=true` inferido |

### Tests unit `mapS3Error` (CA-T23..T30)

| ID | Cenario |
| :-- | :-- |
| CA-T23 | `NoSuchKey`, `NotFound` → `'storage-not-found'` |
| CA-T24 | `AccessDenied` → `'storage-permission-denied'` |
| CA-T25 | `InvalidAccessKeyId`, `SignatureDoesNotMatch` → `'storage-permission-denied'` |
| CA-T26 | `BadDigest`, `InvalidDigest` → `'storage-integrity-mismatch'` |
| CA-T27 | `XAmzContentSHA256Mismatch` → `'storage-integrity-mismatch'` |
| CA-T28 | `code = ECONNREFUSED|ETIMEDOUT|ECONNRESET` / `name = NetworkingError` → `'storage-unavailable'` |
| CA-T29 | Excecao desconhecida (`SomethingWeird`, `new Error('plain')`) → `'storage-upload-failed'` |
| CA-T30 | `caught` nao-Error (`string`, `undefined`, `null`, `{}`) → `'storage-upload-failed'` |

### Tests integration via MinIO (CA-C1..C8 sob nova label)

Guarded por `STORAGE_INTEGRATION=1`. Setup cria bucket dinamico com `randomUUID()` slug — isolamento entre runs. Cleanup deleta objects + bucket.

---

## Constraints e decisoes herdadas para W1

### 1. Dependencies a instalar

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Ambos em `dependencies` (codigo de producao). NUNCA `npm`. Use **MCP `aws-docs`** durante W1 para validar API exata do SDK.

### 2. `S3StorageConfig` shape exato (testado por CA-T15..T22)

```ts
export type S3StorageConfig = Readonly<{
  endpoint: string;
  region: string;
  bucket: BucketName;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  disableChunkedEncoding?: boolean; // opt-in para Magalu (ticket #3); default false
}>;
```

### 3. `AwsS3EnvError` tagged union

```ts
export type AwsS3EnvError =
  | Readonly<{ tag: 'missing-env'; field: string }>
  | Readonly<{ tag: 'invalid-bucket'; raw: string; error: BucketNameError }>;
```

Tests CA-T18..T21 acessam `.tag` + `.field`/`.raw`/`.error` — shape estavel obrigatorio.

### 4. Defaults inferidos em `awsS3Config`

- `endpoint` ausente → `https://s3.<region>.amazonaws.com`
- `forcePathStyle` ausente → `true` se endpoint contem `localhost`/`127.0.0.1`, `false` senao

Heuristica simples (CA-T16 + CA-T22 validam o caminho localhost). W1 confirma com tests.

### 5. `mapS3Error` heuristica (CA-T23..T30)

Inspecao de `.name` (S3ServiceException) E `.code` (NodeJS.ErrnoException de rede). Funcao pura, sem dependencia do SDK em runtime — pode operar sobre qualquer `unknown`. Documentar a tabela no header (request §6).

### 6. Suite contratual: `runDocumentStorageContract(label, setup)` — `setup` deve criar e retornar:

```ts
type ContractSetup = Readonly<{
  storage: DocumentStorage;
  ctx: { bucket: BucketName; makeKey: (suffix: string) => StorageKey };
  cleanup?: () => Promise<void>;
}>;
```

`setup` chamado em `before()` da suite; `cleanup` chamado em `after()`. Cenarios usam keys diferentes por test (via `ctx.makeKey('ca-c{n}-...')`) — sem precisar limpar entre tests.

### 7. Adapter S3: 4 commands

- `upload` → `PutObjectCommand({ Bucket, Key, Body, ContentType, ChecksumSHA256? })`
- `download` → `GetObjectCommand({ Bucket, Key })` + `.Body.transformToByteArray()`
- `exists` → `HeadObjectCommand({ Bucket, Key })` + catch `NotFound` → `ok(false)`
- `signedUrl` → `getSignedUrl(client, new GetObjectCommand(...), { expiresIn: ttlSeconds })` do `@aws-sdk/s3-request-presigner`

W1 implementa + envolve em try/catch convertendo via `mapS3Error`.

### 8. `ChecksumSHA256` em hex → base64

AWS espera base64. Helper interno:

```ts
const hexToBase64 = (hex: string): string => Buffer.from(hex, 'hex').toString('base64');
```

Aplicar quando `input.expectedSha256` for fornecido em `upload`.

### 9. `s3.integration.test.ts` exige MinIO via Docker

Script `test:integration:storage` no `package.json` (W1):

```json
"test:integration:storage": "STORAGE_INTEGRATION=1 docker compose up -d minio --wait && node --test --experimental-strip-types --no-warnings 'tests/modules/contracts/adapters/storage/s3.integration.test.ts'; rc=$?; docker compose down >/dev/null; exit $rc"
```

Sem `STORAGE_INTEGRATION=1`, suite skip-branch garante zero falsos negativos em `pnpm test` default.

### 10. ASCII puro em todos os arquivos novos

Aplica aos 4 test files + (no W1) 3 source files.

### 11. Public-api expose S3 (NAO InMemory)

Diferente do InMemory (interno). Conforme CA13 do request. W1 adiciona exports:

```ts
export type { S3StorageConfig } from '../adapters/storage/s3.ts';
export { createS3DocumentStorage } from '../adapters/storage/s3.ts';
export type { AwsS3ConfigInput, AwsS3EnvError } from '../adapters/storage/s3-config-aws.ts';
export { awsS3Config, parseAwsS3Env } from '../adapters/storage/s3-config-aws.ts';
```

---

## Saida do runner

```
i tests 25
i suites 2
i pass 22
i fail 3
i cancelled 0
i skipped 0
i todo 0
i duration_ms 117.532375

failing tests:
- tests/modules/contracts/adapters/storage/s3-config-aws.test.ts
- tests/modules/contracts/adapters/storage/s3-error-mapper.test.ts
- tests/modules/contracts/adapters/storage/s3.integration.test.ts
(causa: ERR_MODULE_NOT_FOUND em src/modules/contracts/adapters/storage/s3*.ts)
```

**Por que `tests=25` em vez de 16+8+8=32:** os 3 arquivos com import quebrado contam como 1 fail unitario cada (top-level import falha antes do `describe()` rodar). Os 22 pass sao do `in-memory.test.ts` (14 CA-Tn especificos + 8 CA-C1..C8 da suite contratual rodando contra InMemory). Em W1 (apos criar os 3 sources + instalar AWS SDK), os 16 CA-Tn + 8 CA-C* contra S3 emergerao individualmente.

---

## Veredito W0

RED confirmado. 24 cenarios novos descritos:
- 8 CA-C* (suite contratual paramétrica)
- 8 CA-T15..T22 (config builder + parser env)
- 8 CA-T23..T30 (error mapper)

Suite paramétrica ja validada implicitamente contra InMemory (22 pass). ASCII puro. Sem rede em `pnpm test` default (integration guarded).

Proxima wave: **W1 - GREEN** com `nodemailer-email-expert` style — main-session + audit pelo MCP `aws-docs` para validar API exata do SDK durante implementacao.

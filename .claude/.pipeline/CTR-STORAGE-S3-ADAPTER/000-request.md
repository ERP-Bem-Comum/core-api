# 000 — Request CTR-STORAGE-S3-ADAPTER

> **Adapter de produção S3-compatible do port `DocumentStorage`. Size M.**
> Implementa [ADR-0019](../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) §"Decisão" — princípio condutor "1 port, 1 adapter, 1 SDK, N endpoints".
> Pré-requisitos fechados:
>
> - ✅ `CTR-STORAGE-PORT` (port + types)
> - ✅ `CTR-STORAGE-INMEMORY` (adapter de testes + 14 CAs)
>
> Habilita ticket #3 (`CTR-STORAGE-MAGALU-CONFIG`) que reusará este adapter com config builder específico Magalu.

## Justificativa

O port `DocumentStorage` tem hoje **apenas** o adapter InMemory. Sem o adapter S3:

- Use cases de upload de documento (futuro `uploadDocument`, ADR-0019 §"Tickets gerados" #7) não podem rodar em ambientes reais (dev local, CI, staging, prod).
- Suite contratual paramétrica (`document-storage.contract.ts`) só tem 1 implementação para validar — perde-se o ganho de testar "porta abstrata = comportamento equivalente entre adapters".
- Magalu Cloud (ticket #3) não tem adapter para reusar.

Este ticket entrega o adapter genérico S3-compatible + config builder AWS + suite contratual + tests integration via MinIO (Docker compose, já no projeto).

## Decisões fixadas neste ticket

### 1. SDK único: `@aws-sdk/client-s3` (versão 3.x)

Conforme ADR-0019 §"Princípio condutor". Adiciona como dependency direta:

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

`@aws-sdk/s3-request-presigner` é package separado obrigatório para `signedUrl()` (presigned URL V4).

### 2. Um adapter, N endpoints

```ts
// src/modules/contracts/adapters/storage/s3.ts
export const createS3DocumentStorage = (config: S3StorageConfig): DocumentStorage => { ... };
```

Configurável via `S3StorageConfig`. Magalu (ticket #3) usará este mesmo adapter com config builder próprio. MinIO (dev/CI) usa o mesmo adapter com config builder para localhost.

### 3. `S3StorageConfig` shape

```ts
export type S3StorageConfig = Readonly<{
  endpoint: string;              // 'https://s3.us-east-1.amazonaws.com' | 'http://localhost:9000' | 'https://br-se1.magaluobjects.com'
  region: string;                // 'us-east-1' (AWS) | 'us-east-1' (MinIO ignora) | 'br-se1' (Magalu)
  bucket: BucketName;            // branded type — já valido nas regras AWS
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;       // true para MinIO/Magalu; false para AWS S3 (virtual-hosted)
  disableChunkedEncoding?: boolean; // opt-in para Magalu (ticket #3); default false
}>;
```

### 4. `awsS3Config({...})` — config builder AWS

```ts
// src/modules/contracts/adapters/storage/s3-config-aws.ts
export type AwsS3ConfigInput = Readonly<{
  region: string;
  bucket: BucketName;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;   // override (ex.: MinIO em dev/CI aponta para localhost:9000)
  forcePathStyle?: boolean; // override (default false para AWS real, true se endpoint customizado)
}>;

export const awsS3Config = (input: AwsS3ConfigInput): S3StorageConfig => { ... };
```

Defaults inteligentes:
- `endpoint` ausente → `https://s3.<region>.amazonaws.com`
- `forcePathStyle` ausente → `true` se endpoint contém `localhost`/`127.0.0.1`/IP privado, `false` senão (AWS real usa virtual-hosted)

### 5. `parseAwsS3Env(env)` — parser de env vars

```ts
// src/modules/contracts/adapters/storage/s3-config-aws.ts
export type AwsS3EnvError =
  | Readonly<{ tag: 'missing-env'; field: string }>
  | Readonly<{ tag: 'invalid-bucket'; raw: string; error: BucketNameError }>;

export const parseAwsS3Env = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<S3StorageConfig, AwsS3EnvError>;
```

Lê: `S3_ENDPOINT` (opcional), `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` (opcional, `'true'`/`'false'`).

Padrão alinhado com `parseSmtpConfig` (`CTR-EMAIL-ADAPTER-NODEMAILER`).

### 6. Tradução de erros AWS SDK → `DocumentStorageError`

```ts
// src/modules/contracts/adapters/storage/s3-error-mapper.ts
export const mapS3Error = (caught: unknown): DocumentStorageError => { ... };
```

Tabela canônica (documentada no header do source):

| AWS SDK exception / código | `DocumentStorageError` |
| :--- | :--- |
| `NoSuchKey`, `NotFound` (HeadObject 404) | `'storage-not-found'` |
| `AccessDenied`, `InvalidAccessKeyId`, `SignatureDoesNotMatch` | `'storage-permission-denied'` |
| `BadDigest`, `InvalidDigest`, `XAmzContentSHA256Mismatch` | `'storage-integrity-mismatch'` |
| `NetworkingError`, `ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET` | `'storage-unavailable'` |
| TTL inválido (caller passou fora de `(0, 604800]`) | `'storage-invalid-ttl'` |
| Catch-all (5xx, throttle, etc.) | `'storage-upload-failed'` |

Validação de TTL ocorre **antes** de chamar o SDK (early return), evitando round-trip.

### 7. Suite contratual paramétrica

```
tests/modules/contracts/adapters/storage/document-storage.contract.ts
```

Função `runDocumentStorageContract(label: string, makeImpl: () => Promise<DocumentStorage>)` que exporta os cenários comuns que TODA implementação deve cumprir (CA-T1, T2, T4, T5, T6, T7, T8 — os agnósticos de implementação interna).

Consumidores:
1. `tests/modules/contracts/adapters/storage/in-memory.test.ts` (existente — adicionar `runDocumentStorageContract('in-memory', ...)`)
2. `tests/modules/contracts/adapters/storage/s3.integration.test.ts` (novo — `runDocumentStorageContract('s3-minio', ...)` guarded por `STORAGE_INTEGRATION=1`)

CAs específicos da implementação (T3 integrity, T9/T10/T14 defensive copy, T11/T12/T13 helpers do InMemory) ficam **fora** da suite — testados localmente em cada arquivo.

### 8. Tests integration via MinIO local

MinIO já está no `compose.yaml` (vide ADR-0019 §"docker-compose.yml canônico"). Tests usam:
- `STORAGE_INTEGRATION=1` env var como guard (segue padrão `MYSQL_INTEGRATION=1` e `NOTIFICATIONS_INTEGRATION=1`)
- Config builder `awsS3Config({ endpoint: 'http://localhost:9000', region: 'us-east-1', bucket, accessKeyId: 'dev-access-key', secretAccessKey: 'dev-secret-key-min-8-chars', forcePathStyle: true })`
- Bucket criado dinamicamente em `before()` via `CreateBucketCommand`, deletado em `after()` via `DeleteBucketCommand` + cleanup de objetos

### 9. Adapter expõe via public-api

```diff
// src/modules/contracts/public-api/index.ts
+ export type { S3StorageConfig } from '../adapters/storage/s3.ts';
+ export { createS3DocumentStorage } from '../adapters/storage/s3.ts';
+ export type { AwsS3ConfigInput, AwsS3EnvError } from '../adapters/storage/s3-config-aws.ts';
+ export { awsS3Config, parseAwsS3Env } from '../adapters/storage/s3-config-aws.ts';
```

Diferente do InMemory (que ficou interno — decisão I2), o adapter S3 é **prod adapter** e fica exposto. Consumers externos (futuro Financeiro, composition root) injetam `createS3DocumentStorage(awsS3Config(...))`.

## Escopo

### Arquivos a criar

| Arquivo | Conteúdo |
| :--- | :--- |
| `src/modules/contracts/adapters/storage/s3.ts` | `createS3DocumentStorage(config)` + 4 operações via AWS SDK + try/catch convertendo para Result via `mapS3Error` |
| `src/modules/contracts/adapters/storage/s3-config-aws.ts` | `awsS3Config(input)` + `parseAwsS3Env(env)` + types `AwsS3ConfigInput`, `AwsS3EnvError` |
| `src/modules/contracts/adapters/storage/s3-error-mapper.ts` | `mapS3Error(caught: unknown): DocumentStorageError` + heurística documentada |
| `tests/modules/contracts/adapters/storage/document-storage.contract.ts` | Suite paramétrica (function que recebe `makeImpl` e roda cenários comuns) |
| `tests/modules/contracts/adapters/storage/s3-config-aws.test.ts` | 6-8 tests unit para `awsS3Config` defaults + `parseAwsS3Env` happy/missing/invalid paths |
| `tests/modules/contracts/adapters/storage/s3-error-mapper.test.ts` | Tests unitários para `mapS3Error` com fixtures sintéticos (alinhado com lição S2 do `CTR-EMAIL-MAPPER-UNIT-COVERAGE` hardening) |
| `tests/modules/contracts/adapters/storage/s3.integration.test.ts` | `runDocumentStorageContract('s3-minio', ...)` guarded por `STORAGE_INTEGRATION=1` |

### Arquivos a modificar

| Arquivo | Mudança |
| :--- | :--- |
| `src/modules/contracts/public-api/index.ts` | + exports do adapter S3 + config builder + parser |
| `package.json` | + `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` em `dependencies`; + script `test:integration:storage` |
| `tests/modules/contracts/adapters/storage/in-memory.test.ts` | Adicionar `runDocumentStorageContract('in-memory', () => Promise.resolve(createInMemoryDocumentStorage()))` no início, mantendo os 14 CAs específicos |

### Script de integração

```json
"test:integration:storage": "STORAGE_INTEGRATION=1 docker compose up -d minio minio-bootstrap --wait && node --test --experimental-strip-types --no-warnings 'tests/modules/contracts/adapters/storage/s3.integration.test.ts'; rc=$?; docker compose down -v >/dev/null; exit $rc"
```

Padrão simétrico ao `test:integration:notifications`.

## Critérios de aceitação

- **CA1** — `s3.ts` exporta `createS3DocumentStorage(config: S3StorageConfig): DocumentStorage` factory pura, sem efeito top-level (cliente S3 criado dentro do closure).
- **CA2** — As 4 operações (`upload`, `download`, `exists`, `signedUrl`) usam respectivamente `PutObjectCommand`, `GetObjectCommand`, `HeadObjectCommand`, `getSignedUrl` (do `@aws-sdk/s3-request-presigner`).
- **CA3** — `upload` opcionalmente envia `ChecksumSHA256` quando `expectedSha256` é fornecido (AWS valida server-side). Resposta com `BadDigest` mapeia para `'storage-integrity-mismatch'`.
- **CA4** — `mapS3Error(caught)` é função pura sem dependência do SDK em runtime — opera por inspeção de `name`/`Code`/`$metadata` (instanceof opcional para `S3ServiceException`). 6 buckets documentados (tabela §6 acima).
- **CA5** — `awsS3Config(input)` retorna `S3StorageConfig` com defaults inteligentes (endpoint AWS regional, forcePathStyle inferido).
- **CA6** — `parseAwsS3Env(env)` parser puro retornando `Result<S3StorageConfig, AwsS3EnvError>`. Padrão alinhado com `parseSmtpConfig`.
- **CA7** — Suite contratual `document-storage.contract.ts` exporta `runDocumentStorageContract(label, makeImpl)` que valida o subconjunto agnóstico (7 cenários comuns).
- **CA8** — `in-memory.test.ts` consome a suite contratual + mantém os 14 CAs específicos (regressão zero).
- **CA9** — `s3.integration.test.ts` consome a suite contratual contra MinIO local. Guarded por `STORAGE_INTEGRATION=1`. SKIP silencioso em `pnpm test` default.
- **CA10** — `s3-config-aws.test.ts` cobre 6+ cenários: env válido completo; default endpoint inferido de region; default forcePathStyle inferido; missing env por field; bucket inválido (delegando para `createBucketName`); flag `forcePathStyle=true` explícita.
- **CA11** — `s3-error-mapper.test.ts` cobre cada bucket do mapeamento com fixtures sintéticos (sem dependência de rede). Inclui caso `caught` não-Error.
- **CA12** — `try/catch` apenas no adapter (boundary), convertendo para `Result` via `mapS3Error` antes de retornar. Zero leak para application/domain.
- **CA13** — Public-api do contracts exporta `createS3DocumentStorage`, `awsS3Config`, `parseAwsS3Env`, `S3StorageConfig`, `AwsS3ConfigInput`, `AwsS3EnvError`. **NÃO** expõe `mapS3Error` (detalhe interno).
- **CA14** — `package.json` ganha `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` em `dependencies` (NÃO devDependencies — código de produção). Instalado via `pnpm add` (nunca `npm`).
- **CA15** — `test:integration:storage` script no `package.json` sobe MinIO via Docker, roda integration suite, derruba MinIO. Padrão simétrico a `test:integration:notifications`.
- **CA16** — Gates W3 verdes (typecheck/format/lint/test serial). Integration SKIP em `pnpm test` default (sem env).
- **CA17** — ASCII puro em todos os arquivos novos (4 source + 4 test).
- **CA18** — Suite contratual é function factory `(makeImpl) => void` chamada **dentro** de `describe()` do consumer — não roda direto (segue padrão do projeto: `contract-repository.suite.ts`).
- **CA19** — Integration tests criam bucket dinamicamente em `before()` (nome único via UUID curto) e fazem cleanup completo em `after()` (delete objects + delete bucket). Garantia: rodar 2× em sequência não falha.

## Não-objetivos

- **Adapter Magalu** — ticket #3 (`CTR-STORAGE-MAGALU-CONFIG`). Vai reusar este adapter + criar `magaluCloudConfig({...})`.
- **`docker-compose.yml` mudanças** — MinIO já está lá. Se precisar tunar (ex.: bucket pré-criado via `minio-bootstrap`), incluir patch mínimo + documentar.
- **Use case `uploadDocument`** — ADR-0019 §"Tickets gerados" #7. Depende deste + agregado `DocumentoContratual`.
- **`DocumentoContratual` agregado** — ticket separado #6 do ADR-0019.
- **Object Lock / Versioning / Lifecycle / Replication** — features de bucket S3 ficam fora; configuradas via IaC (terraform/CDK) em ticket dedicado quando staging/prod existir.
- **AWS IAM policies** — escopo de operações ficam fora; doc do bucket em ADR-0019.
- **Composition root** — não há use case que precise injetar o adapter ainda. Adapter exposto via public-api para uso futuro.
- **Streaming upload** (objetos grandes via `Upload` do `@aws-sdk/lib-storage`) — port `DocumentStorage.upload` aceita `Uint8Array` cru (decisão CTR-STORAGE-PORT). Streaming fica para ticket de hardening quando volume justificar.
- **Multipart upload manual** — `PutObjectCommand` cobre até 5GB; documentos contratuais não chegam perto disso. Multipart para volumes maiores fica para hardening.
- **Suite contratual paramétrica para Magalu** — `s3.integration.test.ts` já parametrizado; #3 só adiciona variante com config builder próprio.

## Risco / pontos de atenção

1. **`@aws-sdk/client-s3` v3 tem grande superfície de API** — não tentar abstrair tudo. Use apenas os 4 commands necessários: `PutObjectCommand`, `GetObjectCommand`, `HeadObjectCommand`, `getSignedUrl(client, command, { expiresIn })`.
2. **`GetObjectCommand` retorna `Body` como `StreamingBlobPayloadOutput`** — converter para `Uint8Array` via `.transformToByteArray()`. AWS SDK v3 fornece esse helper nativo (Node 18+).
3. **TTL do presigned URL** — AWS V4 signing cap = 7 dias (`expiresIn` em segundos, max 604800). Validar **antes** de chamar `getSignedUrl` (early return `storage-invalid-ttl`).
4. **AWS SDK v3 ESM compatibility** — pacote já tem `exports` field corretos. Verificar que `import { S3Client } from '@aws-sdk/client-s3'` funciona com `NodeNext`. Se aparecer dual package hazard, abrir issue.
5. **`mapS3Error` heurística baseada em `name`/`Code`** — frágil em mudanças de major do SDK. Documentar e cobrir via unit tests com fixtures conhecidos. Cross-link com lição S2 do EMAIL ticket.
6. **`ChecksumSHA256` parameter no PutObjectCommand** — AWS espera SHA-256 em **base64** (não hex). Helper para converter hex → base64 antes de enviar ao SDK. Documentar.
7. **MinIO bootstrap** — `docker compose up -d minio` no script `test:integration:storage`. Confirmar que `minio-bootstrap` (que cria buckets default) é necessário ou se o test cria seu próprio bucket dinâmico em `before()`. Decisão: test cria bucket próprio com UUID curto para isolamento.
8. **Custos AWS** — este ticket NÃO toca AWS real. Tests integration rodam contra MinIO local. Quando staging existir, suite de paridade contra S3 real será ticket separado (ADR-0019 §"Auditoria periódica de paridade").
9. **Bug #47936 (sub-agent interruption):** size M. Workflow direto via main-session com checkpoints frequentes (typecheck após cada arquivo grande).
10. **`@aws-sdk/s3-request-presigner` separado** — é package isolado por design AWS. Adicionar junto na mesma sessão.

## Próximos tickets na frente Storage

| # | Ticket | Size | Status |
| :--- | :--- | :---: | :--- |
| ✅ | `CTR-STORAGE-PORT` | — | closed (port + types) |
| ✅ | `CTR-STORAGE-INMEMORY` | S | closed (14 CAs + audits 2 agentes) |
| **#2 (este)** | **`CTR-STORAGE-S3-ADAPTER`** | **M** | **open** |
| #3 | `CTR-STORAGE-MAGALU-CONFIG` | S | pending (depende deste) |
| #4 | `CTR-STORAGE-COMPOSE` | XS | pending (verificar se compose precisa ajuste pós-#2) |
| #5 | `CTR-DOCUMENT-AGGREGATE` | M | pending (depende de #2-#3 estarem prontos) |
| #6 | `CTR-USECASE-UPLOAD-DOCUMENT` | M | pending |

# 003 - W1 (GREEN) - CTR-STORAGE-S3-ADAPTER

**Skill:** main-session (com MCP `aws-docs` consultado)
**Data:** 2026-05-22
**Veredito:** GREEN. Suite global excl `tests/infra/**`: 712 / 697 pass / 0 fail / 15 skip (+14 testes ativados vs pre-W1, +1 skip do integration guard).

---

## Arquivos criados

| Arquivo | Tipo | CA cobertos |
| :--- | :--- | :--- |
| `src/modules/contracts/adapters/storage/s3-error-mapper.ts` | criado | CA4 |
| `src/modules/contracts/adapters/storage/s3-config-aws.ts` | criado | CA5, CA6 |
| `src/modules/contracts/adapters/storage/document-storage.s3.ts` | criado | CA1, CA2, CA3, CA12 |

## Arquivos modificados

| Arquivo | Mudanca |
| :--- | :--- |
| `package.json` | + deps `@aws-sdk/client-s3 ^3.1052.0` + `@aws-sdk/s3-request-presigner ^3.1052.0` + script `test:integration:storage` |
| `src/modules/contracts/public-api/index.ts` | + exports do adapter S3 + config builder + parser (decisao CA13) |
| `tests/modules/contracts/adapters/storage/s3-config-aws.test.ts` | helper `fromOk<T,E>` -> `fromOk<T>` (fix lint `no-unnecessary-type-parameters`) |

## Decisoes de implementacao

### 1. SDK packages

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Ambos em `dependencies` (codigo de producao). 49 packages transitively added.

### 2. `S3Client` config

```ts
new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: config.forcePathStyle,
});
```

Cliente criado **dentro** do closure de `createS3DocumentStorage` — sem efeito top-level.

### 3. Mapeamento command -> operacao do port

| port | command | observacao |
| :--- | :--- | :--- |
| `upload` | `PutObjectCommand({ Bucket, Key, Body, ContentType, ChecksumSHA256? })` | `ChecksumSHA256` enviado apenas quando `expectedSha256` fornecido. Hex local -> base64 via `Buffer.from(hex, 'hex').toString('base64')`. |
| `download` | `GetObjectCommand({ Bucket, Key })` + `out.Body.transformToByteArray()` | `out.Body` pode ser `undefined` em alguns paths -> `'storage-not-found'`. |
| `exists` | `HeadObjectCommand({ Bucket, Key })` | catch `NotFound` (`name === 'NotFound'`) -> `ok(false)`. Outros erros propagam. |
| `signedUrl` | `getSignedUrl(client, new GetObjectCommand(...), { expiresIn })` | TTL validado ANTES do call (`(0, 604800]`). |

### 4. Integrity check no upload (CA-C3 da suite + CA3 do request)

```ts
const copy = input.bytes.slice();
const hash = sha256hex(copy);
if (input.expectedSha256 !== undefined && input.expectedSha256 !== hash) {
  return err('storage-integrity-mismatch');
}
```

Hash calculado sobre a **copy defensiva** (eliminacao de TOCTOU; mesma estrategia do InMemory). Mismatch retornado ANTES de qualquer rede.

Quando `expectedSha256` foi fornecido E bateu, o adapter envia `ChecksumSHA256` ao S3 — AWS valida server-side e devolve `BadDigest` se corrompeu em transit. Defesa em profundidade.

### 5. `mapS3Error` — heuristica robusta a `unknown`

```ts
export const mapS3Error = (caught: unknown): DocumentStorageError => {
  if (!(caught instanceof Error)) return 'storage-upload-failed';
  const name = caught.name;
  // 4 sets (not-found, permission, integrity, network) + NodeJS.ErrnoException code
  // catch-all 'storage-upload-failed'
};
```

Pura, sem dependencia do SDK. Funciona contra mudancas de major do SDK (apenas o set de `name` casado pode precisar atualizar). Coberta por 8 unit tests (CA-T23..T30) com fixtures sinteticos — sem necessidade de Ethereal/rede.

### 6. Defaults inteligentes em `awsS3Config` (CA-T16, CA-T22 validam)

```ts
const endpoint = input.endpoint ?? `https://s3.${region}.amazonaws.com`;
const forcePathStyle = input.forcePathStyle ?? /(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(endpoint);
```

- `endpoint` ausente -> AWS regional.
- `forcePathStyle` ausente -> infere `true` para hosts locais (MinIO em dev/CI), `false` para AWS real.

### 7. `parseAwsS3Env` (CA6)

Parser puro que recebe `NodeJS.ProcessEnv` como argumento. 4 required (`S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) + 2 opcionais (`S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`). Validacao de bucket delega para `createBucketName`. Padrao alinhado com `parseSmtpConfig` (`CTR-EMAIL-ADAPTER-NODEMAILER`).

### 8. Public-api expoe S3 (NAO InMemory) — CA13

```ts
export type { S3StorageConfig, AwsS3ConfigInput, AwsS3EnvError } from '../adapters/storage/s3-config-aws.ts';
export { awsS3Config, parseAwsS3Env } from '../adapters/storage/s3-config-aws.ts';
export { createS3DocumentStorage } from '../adapters/storage/document-storage.s3.ts';
```

`mapS3Error` NAO exposto (detalhe interno). Conforme decisao herdada do notifications (I2).

### 9. Script `test:integration:storage`

Padrao simetrico ao `test:integration:notifications`:

```json
"test:integration:storage": "docker compose up -d minio --wait && STORAGE_INTEGRATION=1 node --test --experimental-strip-types --no-warnings 'tests/modules/contracts/adapters/storage/s3.integration.test.ts'; rc=$?; docker compose down -v >/dev/null; exit $rc"
```

Requer Docker daemon ativo. Sem ele, integration tests ficam em SKIP (1 skip esperado).

### 10. ASCII puro nos 3 sources

Conforme CA17.

### 11. Naming refletindo decisao do ticket `CTR-ADAPTERS-RENAME-PORT-PREFIX`

`document-storage.s3.ts` (nao `s3.ts`) — padrao `<port>.<tech>.ts`. Test integration `s3.integration.test.ts` ja apontava para esse nome (path antecipado durante o rename).

---

## Gates W3 (parciais)

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | OK (silent exit 0) |
| `pnpm run format:check` | OK ("All matched files use Prettier code style!") |
| `pnpm run lint` | OK (silent exit 0) apos fix de `no-unnecessary-type-parameters` no helper de test |
| `pnpm test` (excl `tests/infra/**`) | **712 / 697 pass / 0 fail / 15 skip** |

Comparativo:

| Marco | tests | pass | fail | skip | Delta |
| :--- | ---: | ---: | ---: | ---: | :--- |
| Baseline (pre-W1, com S3 W0 RED + reorg + rename) | 698 | 681 | 3 | 14 | — |
| **Pos W1 deste ticket** | **712** | **697** | **0** | **15** | **+14 ativos + 3 fails -> 0 + 1 skip integration guard** |

Os 3 fails herdados (s3-config-aws.test.ts, s3-error-mapper.test.ts, s3.integration.test.ts) viraram:
- `s3-config-aws.test.ts`: **8 pass** (CA-T15..T22)
- `s3-error-mapper.test.ts`: **8 pass** (CA-T23..T30)
- `s3.integration.test.ts`: 1 SKIP guarded por `STORAGE_INTEGRATION=1`

Suite contratual (`document-storage.contract.ts`) rodando contra InMemory continua 8 pass (CA-C1..C8) — zero regressao.

### Tests integration via MinIO (opcional)

Nao executado nesta sessao (Docker daemon offline localmente). Para exercer:

```bash
pnpm run test:integration:storage
```

Esperado: 8 CA-C* contra MinIO real.

---

## CAs do request - verificacao

| CA | Status |
| :--- | :--- |
| CA1 - `createS3DocumentStorage(config): DocumentStorage` factory pura | OK |
| CA2 - 4 commands corretos (PutObject/GetObject/HeadObject + getSignedUrl) | OK |
| CA3 - `ChecksumSHA256` em base64 quando `expectedSha256` fornecido | OK |
| CA4 - `mapS3Error` pura, 6 buckets documentados | OK (cobertos por CA-T23..T30) |
| CA5 - `awsS3Config(input)` com defaults inteligentes | OK (CA-T22) |
| CA6 - `parseAwsS3Env` puro retornando `Result<S3StorageConfig, AwsS3EnvError>` | OK |
| CA7 - suite contratual `runDocumentStorageContract(label, makeImpl)` | OK (entregue em W0) |
| CA8 - `in-memory.test.ts` consome suite + mantem 14 CAs especificos | OK (entregue em W0) |
| CA9 - `s3.integration.test.ts` consome suite contra MinIO guarded | OK |
| CA10 - `s3-config-aws.test.ts` 8 cenarios | OK |
| CA11 - `s3-error-mapper.test.ts` cobertura por bucket + caught nao-Error | OK |
| CA12 - try/catch apenas no adapter, convertido via `mapS3Error` | OK |
| CA13 - public-api expoe S3 (nao InMemory) | OK |
| CA14 - deps em `dependencies`, instaladas via `pnpm add` | OK |
| CA15 - script `test:integration:storage` no `package.json` | OK |
| CA16 - gates W3 verdes (integration SKIP default) | OK |
| CA17 - ASCII puro | OK |
| CA18 - suite e function factory `(makeImpl) => void` | OK |
| CA19 - integration cria/deleta bucket dinamico | OK (UUID curto + cleanup `ListObjects + DeleteObjects + DeleteBucket`) |

19/19 satisfeitos.

---

## Riscos remanescentes para W2

1. **Integration tests nao executados localmente** (Docker daemon offline). Mesma situacao do ticket EMAIL. Recomendacao: rodar `pnpm run test:integration:storage` quando ambiente permitir; opcional para fechar este ticket.
2. **`@aws-sdk/client-s3` cresce o bundle/instalacao** — 49 packages adicionais. Aceito como custo de SDK oficial AWS. Sem alternativa razoavel.
3. **Heuristica `mapS3Error` fragil a mudancas de major do SDK** — mitigada por unit tests (CA-T23..T30) com fixtures sinteticos. Documentada no header.
4. **`out.Body.transformToByteArray()` requer SDK v3.x** — funciona em Node 18+ (tem nativo `Readable.toArray` + Web Streams interop). OK em Node 24.

## Veredito W1

GREEN. 19 CAs atendidos. Pronto para W2 (code-review read-only) e W3 (gates ja verdes neste relatorio).

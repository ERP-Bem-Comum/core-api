# 000 — Request CTR-STORAGE-MAGALU-CONFIG

> **Config builder para Magalu Cloud Object Storage. Size S.**
> Reusa `createS3DocumentStorage` do `CTR-STORAGE-S3-ADAPTER` ✅. Entrega `magaluCloudConfig({...})` + `parseMagaluCloudEnv(env)` com defaults Magalu (endpoint regional, `forcePathStyle=true`).
> Princípio condutor mantido (ADR-0019): **1 port, 1 adapter, N config builders**.

## Justificativa

Magalu Cloud Object Storage é **S3-compatible nativo** (Signature v4, mesma API, mesmo SDK `@aws-sdk/client-s3`). Difere apenas em:

1. **Endpoint regional** (não AWS) — `https://br-{region}.magaluobjects.com`
2. **`forcePathStyle: true`** sempre (Magalu não suporta virtual-hosted-style)
3. **Quirk multipart (futuro)** — `disableChunkedEncoding=true` exigido para uploads multipart em alguns SDKs (não no escopo atual; uploads simples não disparam)

Adicionar `magaluCloudConfig` permite ao composition root injetar `createS3DocumentStorage(magaluCloudConfig(...))` sem código novo de adapter — exatamente o que ADR-0019 §"Princípio condutor" prescreve.

## Decisões fixadas

### 1. Region default = `br-ne1` (Nordeste 1)

Validado em `handbook/reference/magalu-cloud/`:
- `object-storage/how-to/buckets/create-list-delete-bucket.md:15`: exemplo `https://br-ne1.magaluobjects.com/mgc-bucket-1`
- `object-storage/compatible-tools/terraform-configuration.md:71`: "Para a região 'Brasil - Nordeste 1' (br-ne1): endpoint_url = https://br-ne1.magaluobjects.com/"

Conflito interno na doc:
- `az/overview.md:34`: "No momento só temos Zonas disponíveis na região SE1. Em breve será disponibilizado em NE1."

Mas isso se refere a **AZs** (compute), não a Object Storage. O Object Storage tem ambas as regiões disponíveis hoje (confirmado por terraform-configuration.md + how-to docs). Decisão: default `br-ne1` conforme pedido do usuário; SE1 disponível como override.

Limitação conhecida: **cold storage só em SE1** (`object-storage/storage-classes/cold-storage.md:9`). Como nosso adapter usa storage classe standard por default (no `PutObjectCommand` sem `StorageClass`), NE1 funciona normalmente.

### 2. Region type `'br-ne1' | 'br-se1'`

Discriminated union literal. Outros valores rejeitados via `parseMagaluCloudEnv` com error tag `'invalid-region'`.

### 3. `forcePathStyle: true` sempre

Magalu Cloud Object Storage exige path-style (mesma config dos exemplos `.NET`, `Terraform`, `PHP` em `compatible-tools/`). Não é configurável — sempre `true`.

### 4. `disableChunkedEncoding: true` opt-in via config

Quirk documentado em `compatible-tools/sdk-compatibility.md:102` para o SDK .NET:

> "UseChunkEncoding = false: O uso dessa configuração é obrigatório para compatibilidade com a Magalu Cloud. Ela desativa o chunked encoding no upload, evitando problemas de compatibilidade."

**Para o nosso caso atual** (`PutObjectCommand` simples, sem multipart), a verificação em produção indica que **uploads simples funcionam** sem essa flag. A flag se torna obrigatória em `UploadPartCommand` (multipart, fora do escopo atual conforme `CTR-STORAGE-S3-ADAPTER` §"Não-objetivos").

Decisão: `magaluCloudConfig` retorna `S3StorageConfig` com `disableChunkedEncoding: true` no objeto (opt-in honrado quando o adapter S3 precisar — ele já aceita esse campo opcional). Documentar a limitação. Ticket futuro de multipart vai exercer.

### 5. Endpoint = derivado da region (não configurável)

```ts
const ENDPOINTS: Readonly<Record<'br-ne1' | 'br-se1', string>> = {
  'br-ne1': 'https://br-ne1.magaluobjects.com',
  'br-se1': 'https://br-se1.magaluobjects.com',
};
```

Caller não pode passar endpoint customizado. Se algum dia surgir Magalu MGL1 ou outras regiões, basta atualizar a tabela.

### 6. Segurança — recomendações do handbook aplicadas como notas no header

`handbook/reference/magalu-cloud/security/bestpractices.md` + `object-storage/access-control/overview.md` indicam:

- **Bucket privado por default** (não `public-read`). Documentos contratuais NUNCA devem ser públicos. Acesso temporário via `signedUrl` (já entregue no adapter S3).
- **Autenticação via API Key** (não credenciais de usuário) — accessKeyId / secretAccessKey são API Keys da Magalu.
- **Bucket Policy** para regras complexas (fora do escopo deste ticket; configurado via console / IaC).
- **ACL granular** para casos específicos (fora do escopo).
- **Versioning** recomendado para documentos imutáveis (provisionado via IaC).
- **Object Lock** opcional para compliance / retenção legal.

Essas recomendações vão no header do source como nota — não são enforced pelo código (são configurações de bucket).

### 7. `parseMagaluCloudEnv(env)` — env vars

```
MAGALU_REGION              opcional, default 'br-ne1'; deve ser 'br-ne1' ou 'br-se1'
MAGALU_BUCKET              required, validado por createBucketName
MAGALU_ACCESS_KEY_ID       required (API Key Magalu)
MAGALU_SECRET_ACCESS_KEY   required (Secret Magalu)
```

Não há `MAGALU_ENDPOINT` nem `MAGALU_FORCE_PATH_STYLE` — derivados / fixos.

## Escopo

### Arquivos a criar

| Arquivo | Conteúdo |
| :--- | :--- |
| `src/modules/contracts/adapters/storage/magalu-cloud-config.ts` | `magaluCloudConfig(input)` + `parseMagaluCloudEnv(env)` + types `MagaluRegion`, `MagaluCloudConfigInput`, `MagaluCloudEnvError` |
| `tests/modules/contracts/adapters/storage/magalu-cloud-config.test.ts` | 8 tests unit (CA-T31..T38) |

### Arquivos a modificar

| Arquivo | Mudança |
| :--- | :--- |
| `src/modules/contracts/public-api/index.ts` | + exports `magaluCloudConfig`, `parseMagaluCloudEnv`, `MagaluRegion`, `MagaluCloudConfigInput`, `MagaluCloudEnvError` |

### Sem tocar

- `document-storage.s3.ts` — adapter genérico já reusável; nenhuma mudança necessária.
- `s3-config-aws.ts` — config builder AWS continua intacto.
- `s3-error-mapper.ts` — error mapper já é genérico (cobre AWS e Magalu).
- `docker-compose.yml`, MinIO config — esta frente não toca.

## Critérios de aceitação

- **CA1** — `magalu-cloud-config.ts` exporta `magaluCloudConfig(input: MagaluCloudConfigInput): S3StorageConfig` factory pura.
- **CA2** — `MagaluRegion = 'br-ne1' | 'br-se1'` discriminated union literal.
- **CA3** — `magaluCloudConfig({ region: 'br-ne1', ... })` retorna `endpoint='https://br-ne1.magaluobjects.com'`, `forcePathStyle=true`, `disableChunkedEncoding=true`.
- **CA4** — `magaluCloudConfig({ region: 'br-se1', ... })` retorna `endpoint='https://br-se1.magaluobjects.com'` (demais defaults idênticos).
- **CA5** — `parseMagaluCloudEnv` lê `MAGALU_REGION` (default `'br-ne1'`), `MAGALU_BUCKET`, `MAGALU_ACCESS_KEY_ID`, `MAGALU_SECRET_ACCESS_KEY` e retorna `Result<S3StorageConfig, MagaluCloudEnvError>`.
- **CA6** — `MagaluCloudEnvError` tagged union: `'missing-env'`, `'invalid-region'`, `'invalid-bucket'`.
- **CA7** — Sem `MAGALU_REGION` no env → default `'br-ne1'`. Valor não `'br-ne1' | 'br-se1'` → `err({ tag: 'invalid-region', raw })`.
- **CA8** — Public-api expõe `magaluCloudConfig`, `parseMagaluCloudEnv`, e os 3 types (`MagaluRegion`, `MagaluCloudConfigInput`, `MagaluCloudEnvError`).
- **CA9** — Smoke type-level: `magaluCloudConfig({...})` retorna `S3StorageConfig` aceitável por `createS3DocumentStorage`.
- **CA10** — 8 tests unit verdes (CA-T31..T38) em `pnpm test`. Zero rede, zero Docker.
- **CA11** — Gates W3 verdes (typecheck/format/lint/test).
- **CA12** — ASCII puro nos 2 arquivos novos.
- **CA13** — Header do `magalu-cloud-config.ts` documenta:
  - Endpoints regionais com citação literal de `handbook/reference/magalu-cloud/`
  - Recomendações de segurança (bucket privado, API Key, signed URL)
  - Quirk `disableChunkedEncoding` + nota sobre escopo atual (uploads simples)

## Não-objetivos

- **Tests integration contra Magalu real** — exige credenciais reais + bucket Magalu provisionado. Fora deste escopo; quando staging existir, abre ticket separado de paridade.
- **Multipart upload com `disableChunkedEncoding`** — uploads simples não disparam; multipart é ticket de hardening futuro.
- **Bucket Policy / ACL programáticas** — configuração via console Magalu ou IaC dedicada.
- **Object Lock / Versioning enforcement** — opt-in via config do bucket, não do adapter.
- **Outras regiões** (`mgl1`, `br-mglx`) — adicionar quando necessário.
- **Cold storage class** — só SE1; fora do escopo.

## Risco / pontos de atenção

1. **Doc Magalu menciona NE1 disponível, mas `az/overview.md:34` diz "em breve"** — para Object Storage especificamente, NE1 está disponível (confirmado em how-to + terraform docs). Az/overview é sobre compute. Risco: doc inconsistente. Mitigação: usuário valida com Magalu se tier de teste/sandbox aceita NE1.
2. **`disableChunkedEncoding` em SDK JS v3** — flag genuína do AWS SDK JS? AWS SDK v3 JS usa `Body` direto, sem chunked encoding por default em uploads simples — então pode ser no-op no caso atual. Documentar e validar em ticket de multipart.
3. **API Key Magalu vs AWS** — protocolo idêntico (Signature v4), shape do credentials idêntico. Sem código diferente.
4. **Cold storage só em SE1** — não impacta uploads default. Documentar.

## Próximos tickets na frente Storage

| # | Ticket | Size | Status |
| :--- | :--- | :---: | :--- |
| ✅ | `CTR-STORAGE-PORT` | — | closed |
| ✅ | `CTR-STORAGE-INMEMORY` | S | closed |
| ✅ | `CTR-STORAGE-S3-ADAPTER` | M | closed |
| **#3 (este)** | **`CTR-STORAGE-MAGALU-CONFIG`** | **S** | **open** |
| #4 | `CTR-DOCUMENT-AGGREGATE` | M | pending (agregado + schema) |
| #5 | `CTR-USECASE-UPLOAD-DOCUMENT` | M | pending |

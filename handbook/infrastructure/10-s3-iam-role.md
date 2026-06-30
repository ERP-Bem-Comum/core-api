# 10 — Storage S3: credenciais estáticas (dev/MinIO/Magalu) × IAM Role (prod AWS ECS)

> Operacionaliza o suporte a **credential provider chain** nos 3 adapters S3 do `core-api`
> (issue [#244](https://github.com/ERP-Bem-Comum/core-api/issues/244)).
> Âncora em [ADR-0019](../architecture/adr/0019-document-storage-s3-with-minio-dev.md)
> (Document Storage — AWS S3 + MinIO dev) e
> [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md)
> (topologia AWS-primary + MagaluCloud-PBE).

---

## Visão geral

O `core-api` expõe três adapters S3, um por módulo:

| Módulo | Adapter | Config |
| :--- | :--- | :--- |
| `contracts` | `createS3DocumentStorage` | `S3StorageConfig` via `parseAwsS3Env` |
| `auth` | `createS3ProfilePhotoStorage` | `ProfilePhotoS3Config` via `buildProfilePhotoStorage` |
| `programs` | `createS3LogoStorage` | `LogoS3Config` via `readProgramsLogoConfig` |

Antes da issue #244, os três exigiam `accessKeyId` e `secretAccessKey` sempre. Isso
forçava segredo estático em produção AWS, onde o correto é usar **IAM Role** (tarefa ECS
assume role → IMDS fornece credencial temporária rotacionada automaticamente).

**Após a issue #244**, os campos `accessKeyId`/`secretAccessKey` são **opcionais** nos três
tipos de config. O `@aws-sdk/client-s3` é construído sem o bloco `credentials` quando
ambos estão ausentes, e o SDK resolve via **credential provider chain** nativa (ECS task
role → IMDS v2 → env `AWS_ACCESS_KEY_ID` → `~/.aws/credentials`).

### Invariante de segurança — XOR das credenciais

| `accessKeyId` | `secretAccessKey` | Comportamento |
| :---: | :---: | :--- |
| presente | presente | Credenciais estáticas injetadas no `S3Client` (dev/MinIO/Magalu) |
| ausente | ausente | Bloco `credentials` omitido; SDK usa provider chain (IAM Role ECS/IMDS) |
| presente | **ausente** | **Erro de config** — rejeitado pelo parser/builder (XOR) |
| **ausente** | presente | **Erro de config** — rejeitado pelo parser/builder (XOR) |

Credencial "pela metade" (XOR) é rejeitada para evitar que o SDK tente autenticar com
dados incompletos e falhe silenciosamente em runtime. O comportamento fail-fast no boot é
preferível a um erro de `SignatureDoesNotMatch` no primeiro request.

---

## Matriz de ambientes

| Ambiente | Provedor de storage | Credenciais | Env vars necessárias |
| :--- | :--- | :--- | :--- |
| Dev local (MinIO) | MinIO via Docker Compose | Estáticas | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| CI (GitHub Actions) | MinIO service container | Estáticas | Idem dev local (via secrets do Actions) |
| PBE MagaluCloud | Magalu Object Storage (S3-compat) | Estáticas | `S3_ENDPOINT` (URL Magalu), demais idem |
| Produção AWS ECS | AWS S3 | **IAM Role** (sem credencial estática) | `S3_REGION`, `S3_BUCKET` apenas (`S3_ACCESS_KEY_ID`/`SECRET` ausentes) |

Para os módulos `auth` e `programs`, substituir o prefixo `S3_` pelo específico do módulo
(veja a tabela de env vars abaixo).

---

## Env vars por módulo

### `contracts` — documentos contratuais

| Var | Obrigatória | Descrição |
| :--- | :---: | :--- |
| `S3_REGION` | sim | Região AWS (ex: `us-east-1`) ou ignorada pelo MinIO/Magalu |
| `S3_BUCKET` | sim | Nome do bucket (validado como `BucketName`) |
| `S3_ENDPOINT` | não | URL do endpoint; ausente → `https://s3.<region>.amazonaws.com` |
| `S3_ACCESS_KEY_ID` | não* | Access key estática; ausente junto com SECRET → provider chain |
| `S3_SECRET_ACCESS_KEY` | não* | Secret key estática; XOR com `ACCESS_KEY_ID` → erro |
| `S3_FORCE_PATH_STYLE` | não | `true` para MinIO/Magalu; inferido `true` quando endpoint contém `localhost` |

### `auth` — fotos de perfil

| Var | Obrigatória | Descrição |
| :--- | :---: | :--- |
| `S3_ENDPOINT` | sim** | Endpoint do storage; ausente → in-memory (sem storage) |
| `S3_BUCKET` | sim** | Nome do bucket; ausente → in-memory |
| `S3_REGION` | não | Região; ausente → `us-east-1` |
| `S3_ACCESS_KEY_ID` | não* | Credencial estática; XOR com SECRET → fall-safe in-memory |
| `S3_SECRET_ACCESS_KEY` | não* | Idem; XOR com ACCESS_KEY_ID → fall-safe in-memory |
| `S3_FORCE_PATH_STYLE` | não | Default `true` (leitura: `!== 'false'`); setar `false` explicitamente em prod AWS |

### `programs` — logos de programa

| Var | Obrigatória | Descrição |
| :--- | :---: | :--- |
| `PROGRAMS_LOGO_S3_ENDPOINT` | sim** | Ausente → in-memory |
| `PROGRAMS_LOGO_S3_BUCKET` | sim** | Ausente → in-memory |
| `PROGRAMS_LOGO_S3_REGION` | não | Ausente → `us-east-1` |
| `PROGRAMS_LOGO_S3_ACCESS_KEY_ID` | não* | XOR com SECRET → fall-safe in-memory |
| `PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY` | não* | XOR com ACCESS_KEY_ID → fall-safe in-memory |
| `PROGRAMS_LOGO_S3_FORCE_PATH_STYLE` | não | Default `true`; setar `false` em prod AWS |

`*` Obrigatória apenas para credenciais estáticas (dev/MinIO/Magalu). Em prod AWS com IAM Role, omitir ambas.
`**` Ausência ativa fallback in-memory (sem erro de boot; storage desabilitado).

---

## Configuração prod AWS ECS (IAM Role — sem segredo estático)

### 1. IAM Policy mínima para a task role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CoreApiS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::contracts-documents/*",
        "arn:aws:s3:::auth-photos/*",
        "arn:aws:s3:::programs-logos/*"
      ]
    }
  ]
}
```

> Adicionar `s3:GetBucketLocation` no nível do bucket se o SDK precisar resolver
> a região automaticamente (normalmente não é necessário quando `S3_REGION` está setada).

### 2. Task definition ECS — env vars (sem credenciais)

```json
{
  "environment": [
    { "name": "S3_REGION",  "value": "us-east-1" },
    { "name": "S3_BUCKET",  "value": "contracts-documents" },
    { "name": "S3_FORCE_PATH_STYLE", "value": "false" },

    { "name": "S3_ENDPOINT", "value": "" },

    { "name": "PROGRAMS_LOGO_S3_REGION",  "value": "us-east-1" },
    { "name": "PROGRAMS_LOGO_S3_BUCKET",  "value": "programs-logos" },
    { "name": "PROGRAMS_LOGO_S3_ENDPOINT", "value": "https://s3.us-east-1.amazonaws.com" },
    { "name": "PROGRAMS_LOGO_S3_FORCE_PATH_STYLE", "value": "false" }
  ]
}
```

`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` e os equivalentes de `auth`/`programs` são
**omitidos intencionalmente** — ausência de ambos ativa o provider chain.

> **Nota sobre `S3_ENDPOINT` vazio:** o `contracts` usa `parseAwsS3Env` que trata string
> vazia como ausente, inferindo `https://s3.<region>.amazonaws.com`. Setar para `""` ou
> omitir completamente produz o mesmo resultado.

### 3. Verificação rápida pós-deploy

```bash
# Substitua <token> por um access token com contracts:write ou fiscal-document:write
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://<host>/api/v1/contracts/<id>/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf"
# Esperado: 201 (upload ok via IAM Role)
```

---

## Configuração dev/MinIO (credenciais estáticas — sem alteração)

O comportamento dev não mudou. Quando ambas as variáveis estão presentes, o `S3Client`
recebe `credentials` explícitas — exatamente como antes da issue #244.

```bash
# .env (dev local)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=contracts-documents
S3_ACCESS_KEY_ID=dev-access-key
S3_SECRET_ACCESS_KEY=dev-secret-key-min-8-chars
S3_FORCE_PATH_STYLE=true
```

---

## Configuração PBE MagaluCloud (credenciais estáticas)

O MagaluCloud é S3-compat mas não suporta IMDS/IAM Role — credenciais estáticas são
obrigatórias. Obtenha as chaves no painel MGC e configure:

```bash
# .env (PBE MagaluCloud — ADR-0021)
S3_ENDPOINT=https://br-ne1.magaluobjects.com
S3_REGION=br-ne1
S3_BUCKET=contracts-documents
S3_ACCESS_KEY_ID=<mgc-access-key>
S3_SECRET_ACCESS_KEY=<mgc-secret-key>
S3_FORCE_PATH_STYLE=true
```

Referência: `handbook/reference/magalu-cloud/object-storage/`.

---

## Arquivos alterados (issue #244)

| Arquivo | Mudança |
| :--- | :--- |
| `src/modules/contracts/adapters/storage/s3-config-aws.ts` | `accessKeyId`/`secretAccessKey` opcionais; `parseAwsS3Env` com lógica XOR; `ALWAYS_REQUIRED` sem as credenciais |
| `src/modules/contracts/adapters/storage/document-storage.s3.ts` | Spread condicional `credentials` no `S3Client` |
| `src/modules/auth/adapters/storage/profile-photo-storage.s3.ts` | `ProfilePhotoS3Config` com campos opcionais; spread condicional |
| `src/modules/auth/adapters/http/composition.ts` | `buildProfilePhotoStorage` com nova lógica XOR + ativa S3 sem credenciais quando endpoint+bucket presentes |
| `src/modules/programs/adapters/storage/logo-storage.s3.ts` | `LogoS3Config` com campos opcionais; spread condicional |
| `src/server.ts` | `readProgramsLogoConfig` com nova lógica XOR + ativa quando endpoint+bucket presentes |
| `tests/modules/contracts/adapters/storage/s3-config-aws.test.ts` | CA-T23/T24/T25 (IAM Role + XOR) |
| `tests/modules/auth/adapters/storage/profile-photo-storage.s3-config.test.ts` | Novo — T1/T2/T3 |
| `tests/modules/programs/adapters/storage/logo-storage.s3-config.test.ts` | Novo — T1/T2/T3 |

---

## Referências

- [ADR-0019](../architecture/adr/0019-document-storage-s3-with-minio-dev.md) — Document Storage AWS S3 + MinIO (dev). Decisão original de storage.
- [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) — Topologia AWS-primary + MagaluCloud-PBE. Define onde cada ambiente roda.
- Issue [#244](https://github.com/ERP-Bem-Comum/core-api/issues/244) — feat/infra: IAM Role nos 3 adapters S3.
- AWS Docs — [IAM roles for Amazon ECS tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html).
- `@aws-sdk/client-s3` — credential provider chain resolução automática quando `credentials` é omitido do `S3Client`.

# 003 - W1 (GREEN) - CTR-STORAGE-MAGALU-CONFIG

**Skill:** main-session
**Data:** 2026-05-22
**Veredito:** GREEN. Suite global excl `tests/infra/**`: 720 / 705 pass / 0 fail / 15 skip (+8 tests novos do CA-T31..T38).

## Arquivos

| Arquivo | Tipo | CAs |
| :--- | :--- | :--- |
| `src/modules/contracts/adapters/storage/magalu-cloud-config.ts` | criado | CA1..CA7, CA12, CA13 |
| `tests/modules/contracts/adapters/storage/magalu-cloud-config.test.ts` | criado em W0 | CA-T31..T38 (CA10) |
| `src/modules/contracts/public-api/index.ts` | + exports Magalu | CA8 |

## Decisoes de implementacao

### 1. Region default `br-ne1` (CA3)

```ts
const DEFAULT_REGION: MagaluRegion = 'br-ne1';
```

Conforme pedido do usuario + confirmado disponivel no Object Storage Magalu pelos docs `handbook/reference/magalu-cloud/object-storage/how-to/buckets/create-list-delete-bucket.md:15` e `compatible-tools/terraform-configuration.md:71`.

### 2. Tabela de endpoints fixa

```ts
const ENDPOINTS: Readonly<Record<MagaluRegion, string>> = {
  'br-ne1': 'https://br-ne1.magaluobjects.com',
  'br-se1': 'https://br-se1.magaluobjects.com',
};
```

Caller nao pode passar endpoint custom. Type guard `isMagaluRegion(raw)` para `parseMagaluCloudEnv`.

### 3. `forcePathStyle: true` + `disableChunkedEncoding: true` sempre

Hardcoded no `magaluCloudConfig` — exigencia Magalu (compatible-tools/sdk-compatibility.md:102). `disableChunkedEncoding` no escopo atual (PutObjectCommand simples) e no-op; setado para ticket futuro de multipart.

### 4. `MagaluCloudEnvError` discriminated union (CA6)

```ts
type MagaluCloudEnvError =
  | { tag: 'missing-env'; field: string }
  | { tag: 'invalid-region'; raw: string }
  | { tag: 'invalid-bucket'; raw: string; error: BucketNameError };
```

Tests CA-T37/T38 acessam `.tag` + payload — shape estavel obrigatorio.

### 5. Header documenta segurança + endpoints (CA13)

Header do source registra:
- Tabela de endpoints com citação literal dos arquivos do handbook
- 4 recomendacoes de seguranca (bucket privado, API Key Magalu, Bucket Policy/ACL via console, Versioning/Object Lock via IaC)
- Quirk `disableChunkedEncoding` documentado com escopo (multipart no futuro)

### 6. Reuso do adapter S3 — zero codigo novo de adapter (CA9)

CA-T33 valida via TypeScript: `const asS3: S3StorageConfig = magaluCloudConfig(...)` typechecks. Composition root pode: `createS3DocumentStorage(magaluCloudConfig({...}))`.

## Gates W3 (parciais)

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | OK |
| `pnpm run format:check` | OK |
| `pnpm run lint` | OK |
| `pnpm test` (excl `tests/infra/**`) | **720 / 705 pass / 0 fail / 15 skip** (+8 vs baseline) |

## CAs

13/13 satisfeitos. Detalhes em [REVIEW W2].

## Veredito W1

GREEN. Pronto para W2 + W3.

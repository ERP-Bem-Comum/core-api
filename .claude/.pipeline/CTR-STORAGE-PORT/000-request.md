# Ticket CTR-STORAGE-PORT: Port `DocumentStorage` + Value Objects da fronteira S3

> Documentação PT, identificadores EN (regra invariante).
> Primeiro ticket da sequência de 9 derivados de [ADR-0019](../../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md).

## Contexto

A [ADR-0019](../../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) decidiu que o módulo `contracts` terá **AWS S3** como storage de produção, com **MinIO via Docker Compose** como equivalente local — comunicação via **`@aws-sdk/client-s3`** e troca prod↔dev por **configuração de endpoint**.

A próxima sequência de tickets vai materializar essa decisão. Este é o **primeiro**: define o **port** (contrato) e os **value objects** da fronteira, **sem implementação concreta**. Os adapters (`InMemory`, S3-compatível), o agregado `DocumentoContratual`, os use cases e a CLI vêm em tickets sucessores (CTR-STORAGE-INMEMORY, CTR-STORAGE-S3-ADAPTER, CTR-DOCUMENT-AGGREGATE, CTR-USECASE-UPLOAD-DOCUMENT, CTR-AMENDMENT-DOCUMENT-LINK, CTR-CLI-UPLOAD, CTR-STORAGE-COMPOSE, CTR-STORAGE-CI).

Sem este ticket, nenhum dos próximos tem onde apoiar tipos. **Port primeiro, adapter depois** — princípio do ADR-0006 (ports & adapters).

## Princípio condutor

> **O domínio fala com um contrato abstrato (`DocumentStorage`). A linguagem S3 — bucket, key, hash, presigned URL — é a Linguagem Ubíqua da fronteira (handbook §07). As validações da AWS viram invariantes nos value objects.**

## Escopo

```
src/modules/contracts/
├── domain/shared/
│   ├── bucket-name.ts          # Branded BucketName + smart constructor com regras S3
│   ├── storage-key.ts          # Branded StorageKey + smart constructor com regras S3
│   └── storage-ref.ts          # Value Object StorageRef (bucket+key+hash+size+mime)
└── application/ports/
    └── document-storage.ts     # Port DocumentStorage + UploadInput + DocumentStorageError

tests/modules/contracts/
├── domain/shared/
│   ├── bucket-name.test.ts
│   ├── storage-key.test.ts
│   └── storage-ref.test.ts
└── application/ports/
    └── document-storage.contract.ts   # Suite de contrato reutilizável (consumida por adapters futuros)
```

## Fora de escopo

- **Adapter `InMemory`** → `CTR-STORAGE-INMEMORY` (próximo ticket).
- **Adapter S3-compatível** (AWS SDK v3) → `CTR-STORAGE-S3-ADAPTER`.
- **Agregado `DocumentoContratual`** (categorias, retenção, status, link com Amendment) → `CTR-DOCUMENT-AGGREGATE`.
- **Use case `uploadDocument`** → `CTR-USECASE-UPLOAD-DOCUMENT`.
- **`docker-compose.yml` + MinIO** → `CTR-STORAGE-COMPOSE`.
- **CI service container** → `CTR-STORAGE-CI`.
- **Refator de `attachSignedDocument`** → `CTR-AMENDMENT-DOCUMENT-LINK`.
- **CLI `subir-documento`** → `CTR-CLI-UPLOAD`.
- **Versioning, Object Lock, lifecycle policies** — features de bucket do S3, não do port.
- **Streaming / multipart upload** (>5GB) — fora do MVP; port aceita `Uint8Array`.
- **Encryption at rest custom** (SSE-C) — confiar no backend (MinIO/S3) por enquanto.

## Decisões de design

| # | Decisão | Justificativa |
| :- | :--- | :--- |
| D1 | `BucketName` e `StorageKey` são **branded types** em `domain/shared/` | Mesma convenção de `ContractId`, `AmendmentId`, `Money`, `Period`. As validações são invariantes do sistema, não detalhe de adapter. |
| D2 | `StorageRef` é `Readonly<{...}>` simples (não-branded) — agrega 5 campos | Não é um identificador único; é um descritor composto. `BucketName` + `StorageKey` já são branded por dentro. |
| D3 | Smart constructors retornam `Result<T, E>` com **erro union literal** específico por tipo | Padrão estabelecido em `Money.fromCents`, `Period.create`, `ContractId.rehydrate`. |
| D4 | Validações de `BucketName` espelham **as regras documentadas da AWS S3** | Lista canônica abaixo. Garante que dev (MinIO) e prod (AWS) tenham mesma fronteira. |
| D5 | Validações de `StorageKey` espelham **as regras documentadas da AWS S3** | Idem. |
| D6 | Port `DocumentStorage` tem **4 operações**: `upload`, `download`, `exists`, `signedUrl` | Mínimo viável para os use cases planejados. `delete` fica fora do MVP (exclusão é lógica via agregado — RN-11). |
| D7 | `UploadInput` aceita `expectedSha256?` opcional | Quem chama pode demandar verificação de integridade. Se fornecido, adapter compara após upload e falha se divergir. |
| D8 | `signedUrl(ref, ttlSeconds)` rejeita `ttl > 604_800` (7 dias, limite S3 V4 signing) | Pega bug clássico em dev (TTL de 30 dias) que falharia silenciosamente em prod. |
| D9 | Erro `DocumentStorageError` é union literal pequena (6 códigos) | Mesma estética de `ContractRepositoryError` (2 códigos) e `AmendmentError` (10 códigos). Adapters mapeiam erros nativos para esses códigos. |
| D10 | **Sem `delete()` no port** nesta fase | RN-11 do handbook exige exclusão lógica via status do agregado. Storage físico só apaga quando lifecycle do bucket decide (job operacional, fora do código). |
| D11 | Port **não** expõe metadata custom no MVP | `UploadInput.metadata?: Record<string, string>` fica reservado, mas **não implementado** neste ticket — entra quando primeiro use case precisar. |
| D12 | **Suite de contrato reutilizável** (`document-storage.contract.ts`) escrita já neste ticket | Quando `CTR-STORAGE-INMEMORY` rodar, a suite pluga direto. Mesma estratégia de `ContractRepositorySuite`. |

## Especificação dos value objects

### `BucketName` — regras espelhando AWS S3

Fonte: [Bucket naming rules — AWS S3 docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html).

Aceito quando, **simultaneamente**:

- 3 a 63 caracteres.
- Apenas `a-z`, `0-9`, `.` (ponto), `-` (hífen).
- Começa e termina com letra ou número.
- Sem dois pontos consecutivos (`..`).
- Sem formato de endereço IP (`^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$`).
- Sem prefixo reservado (`xn--`, `sthree-`, `sthree-configurator`).
- Sem sufixo reservado (`-s3alias`, `--ol-s3`).

**Erros:**
```ts
type BucketNameError =
  | 'bucket-name-too-short'         // < 3 chars
  | 'bucket-name-too-long'          // > 63 chars
  | 'bucket-name-invalid-chars'     // chars fora do conjunto permitido
  | 'bucket-name-must-start-alphanumeric'
  | 'bucket-name-must-end-alphanumeric'
  | 'bucket-name-consecutive-dots'
  | 'bucket-name-ip-address-format'
  | 'bucket-name-reserved-prefix'
  | 'bucket-name-reserved-suffix';
```

### `StorageKey` — regras espelhando AWS S3

Fonte: [Object key naming guidelines — AWS S3 docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html).

Aceito quando, **simultaneamente**:

- 1 a 1024 bytes em UTF-8 (não caracteres — bytes).
- Sem caracteres de controle (`\x00-\x1F` e `\x7F`).
- Sem começar com `/`.
- Sem `//` (barras duplas) — gera comportamento ambíguo.
- Sem `..` ou `./` (path traversal) — defesa em profundidade contra escrita fora do bucket em adapters FS.

**Erros:**
```ts
type StorageKeyError =
  | 'storage-key-empty'
  | 'storage-key-too-long'          // > 1024 bytes UTF-8
  | 'storage-key-leading-slash'
  | 'storage-key-double-slash'
  | 'storage-key-path-traversal'    // contém `..` ou `./`
  | 'storage-key-control-chars';
```

### `StorageRef` — value object composto

```ts
export type StorageRef = Readonly<{
  bucket: BucketName;
  key: StorageKey;
  hashSha256: string;          // 64 hex chars, lowercase — validado no smart constructor
  sizeBytes: number;           // inteiro >= 0
  mimeType: string;            // não-vazio; validação semântica fica no adapter (IANA é overkill aqui)
}>;
```

Smart constructor: `StorageRef.create(input) → Result<StorageRef, StorageRefError>`.

**Erros:**
```ts
type StorageRefError =
  | 'storage-ref-invalid-hash'        // não-hex, tamanho != 64
  | 'storage-ref-negative-size'
  | 'storage-ref-non-integer-size'
  | 'storage-ref-empty-mime-type';
```

### `UploadInput`

```ts
export type UploadInput = Readonly<{
  bucket: BucketName;
  key: StorageKey;
  bytes: Uint8Array;
  mimeType: string;
  expectedSha256?: string;     // opcional; se presente, adapter valida pós-upload
}>;
```

### Port `DocumentStorage`

```ts
export type DocumentStorageError =
  | 'storage-upload-failed'
  | 'storage-not-found'
  | 'storage-integrity-mismatch'
  | 'storage-invalid-ttl'        // signedUrl com TTL > 604800 ou <= 0
  | 'storage-unavailable'        // erro de rede, MinIO/S3 fora do ar
  | 'storage-permission-denied';

export type DocumentStorage = Readonly<{
  upload: (input: UploadInput) => Promise<Result<StorageRef, DocumentStorageError>>;
  download: (ref: StorageRef) => Promise<Result<Uint8Array, DocumentStorageError>>;
  exists: (ref: StorageRef) => Promise<Result<boolean, DocumentStorageError>>;
  signedUrl: (ref: StorageRef, ttlSeconds: number) => Promise<Result<URL, DocumentStorageError>>;
}>;
```

## Critérios de aceite

### `BucketName.create(raw: string)`

- [ ] `"contracts-documents"` → `Ok`.
- [ ] `"abc"` (mínimo) → `Ok`.
- [ ] `"a".repeat(63)` (máximo) → `Ok`.
- [ ] `"ab"` (curto demais) → `Err('bucket-name-too-short')`.
- [ ] `"a".repeat(64)` (longo demais) → `Err('bucket-name-too-long')`.
- [ ] `"Contracts"` (maiúsculas) → `Err('bucket-name-invalid-chars')`.
- [ ] `"contract_docs"` (underscore) → `Err('bucket-name-invalid-chars')`.
- [ ] `"-contracts"` / `"contracts-"` (hífen nas pontas) → `Err('bucket-name-must-start-alphanumeric'` / `-must-end-`).
- [ ] `"contracts..docs"` → `Err('bucket-name-consecutive-dots')`.
- [ ] `"192.168.1.1"` → `Err('bucket-name-ip-address-format')`.
- [ ] `"xn--mybucket"` → `Err('bucket-name-reserved-prefix')`.
- [ ] `"mybucket-s3alias"` → `Err('bucket-name-reserved-suffix')`.

### `StorageKey.create(raw: string)`

- [ ] `"2026/05/aditivo-abc.pdf"` → `Ok`.
- [ ] `"a"` (1 byte) → `Ok`.
- [ ] string de 1024 bytes UTF-8 → `Ok`.
- [ ] `""` → `Err('storage-key-empty')`.
- [ ] string de 1025 bytes UTF-8 → `Err('storage-key-too-long')`.
- [ ] caracteres multi-byte UTF-8 contando corretamente em bytes, não code points (ex.: `"ç".repeat(513)` = 1026 bytes → `Err`).
- [ ] `"/leading"` → `Err('storage-key-leading-slash')`.
- [ ] `"a//b"` → `Err('storage-key-double-slash')`.
- [ ] `"../escape"` → `Err('storage-key-path-traversal')`.
- [ ] `"a/./b"` → `Err('storage-key-path-traversal')`.
- [ ] string contendo `\x00` ou `\x1F` → `Err('storage-key-control-chars')`.

### `StorageRef.create(input)`

- [ ] Input válido (hash 64 hex lowercase, size >= 0 inteiro, mime não-vazio) → `Ok`.
- [ ] Hash de 63 chars → `Err('storage-ref-invalid-hash')`.
- [ ] Hash com chars não-hex (`"g"`) → `Err`.
- [ ] Hash em maiúsculas → `Err` (canonicalizar lowercase é responsabilidade do produtor).
- [ ] `sizeBytes: -1` → `Err('storage-ref-negative-size')`.
- [ ] `sizeBytes: 1.5` → `Err('storage-ref-non-integer-size')`.
- [ ] `mimeType: ""` → `Err('storage-ref-empty-mime-type')`.

### Suite de contrato `documentStorageContract(makeStorage)`

Conjunto de cenários parametrizado por uma função-fábrica do storage. Não executa contra nenhum adapter neste ticket — apenas **declara os cenários** para reuso em `CTR-STORAGE-INMEMORY` e `CTR-STORAGE-S3-ADAPTER`.

Cenários mínimos esperados (cada um é uma `test()` exportada):
- [ ] `upload de bytes retorna StorageRef com hash correto`.
- [ ] `download após upload retorna mesmos bytes` (round-trip).
- [ ] `upload com expectedSha256 correto sucede`.
- [ ] `upload com expectedSha256 divergente retorna storage-integrity-mismatch`.
- [ ] `download de ref inexistente retorna storage-not-found`.
- [ ] `exists retorna true para ref existente, false para inexistente`.
- [ ] `signedUrl com ttl <= 0 retorna storage-invalid-ttl`.
- [ ] `signedUrl com ttl > 604800 retorna storage-invalid-ttl`.
- [ ] `signedUrl com ttl válido retorna URL não-vazia`.

### Tipagem (compile-time)

- [ ] `string as BucketName` falha em build (sem brand).
- [ ] `string as StorageKey` falha em build.
- [ ] `function f(b: BucketName)` rejeita passar uma `StorageKey` direto.
- [ ] `DocumentStorage` é `type`, **não** `class` nem `interface` com implementação.
- [ ] Todos os métodos do port retornam `Promise<Result<_, DocumentStorageError>>`.

## Plano de waves

| Wave | Skill | Entregas |
| :--- | :--- | :--- |
| **W0 RED** | `ts-domain-modeler` | Testes de `BucketName`, `StorageKey`, `StorageRef` (vermelhos). Esqueleto da suite de contrato. |
| **W1 GREEN** | `ts-domain-modeler` + `ports-and-adapters` | Smart constructors + port + tipos. Testes verdes. |
| **W2 REVIEW** | `code-reviewer` | Auditoria: zero throw, sem `class`, branded types corretos, Result em todo lugar, switch exhaustivo. |
| **W3 QUALITY** | `ts-quality-checker` | `tsc --noEmit`, prettier, `node --test` — tudo verde. |

## Conformidade com regras transversais

- ✅ **`throw` proibido** — todos os smart constructors retornam `Result`.
- ✅ **Sem `class`, sem `this`** — port é `type`, VOs são funções puras agrupadas em namespace.
- ✅ **`Readonly<>`** em todos os tipos.
- ✅ **Branded types** para `BucketName` e `StorageKey`.
- ✅ **Result em todo lugar** — erros são union literais.
- ✅ **`import type`** quando importação for puramente de tipo.
- ✅ **Extensões `.ts`** em todos os imports relativos.

## Dependências novas

**Nenhuma.** Este ticket é puro TypeScript. O AWS SDK só entra em `CTR-STORAGE-S3-ADAPTER`.

## Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Sobre-engenharia das validações de `BucketName`/`StorageKey` | Manter aderência **literal** à doc AWS S3 — nenhuma regra extra "porque sim". |
| Drift entre validações e a doc AWS no futuro | Cada regra tem comentário com link/seção da doc. Revisão trimestral no roadmap (fora deste ticket). |
| Suite de contrato cria acoplamento prematuro | Exportar como **função-fábrica** que recebe `makeStorage`. Adapters consomem; ninguém é forçado a implementar antes de existir. |
| `StorageRef` exposto no domínio pode "infectar" o agregado `DocumentoContratual` com vocabulário de infra | Aceitável: handbook §07 reconhece "bucket/key/hash" como Linguagem Ubíqua da fronteira. Equivalente ao `Money.cents` (também é vocabulário de infra). |
| Confusão entre `StorageRef` (descritor) e `DocumentId` (identidade interna do agregado) | Documentar no W1: `DocumentId` identifica o **registro de documento** no domínio; `StorageRef` identifica os **bytes** em storage externo. Um agregado tem ambos. |

## Tickets sucessores (mapeados do ADR-0019)

Ordem sugerida de execução:

1. ← **CTR-STORAGE-PORT** (este ticket)
2. `CTR-STORAGE-INMEMORY` — adapter InMemory consumindo a suite de contrato.
3. `CTR-STORAGE-S3-ADAPTER` — adapter único `@aws-sdk/client-s3` configurável por endpoint.
4. `CTR-STORAGE-COMPOSE` — `docker-compose.yml` com MinIO + healthcheck.
5. `CTR-STORAGE-CI` — workflow GitHub Actions com service container.
6. `CTR-DOCUMENT-AGGREGATE` — agregado `DocumentoContratual` + repo + schema Drizzle.
7. `CTR-USECASE-UPLOAD-DOCUMENT` — use case que orquestra hash + storage + repo + evento `DocumentoDisponibilizado`.
8. `CTR-AMENDMENT-DOCUMENT-LINK` — refator de `attachSignedDocument`.
9. `CTR-CLI-UPLOAD` — subcomando `subir-documento`.

## Referências

- [ADR-0019](../../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) — Document Storage S3 + MinIO.
- [ADR-0006](../../../../handbook/architecture/adr/0006-modular-monolith-core-api.md) — Ports & adapters.
- [ADR-0010](../../../../handbook/architecture/adr/0010-email-port-adapter-pattern.md) — Mesmo padrão de port para serviço externo.
- [Handbook §07-external-context](../../../../handbook/domain_questions/contratos/07-external-context.md) — ACL para Storage.
- [AWS S3 — Bucket naming rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html).
- [AWS S3 — Object key naming guidelines](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html).
- Ticket [CTR-VO-IDS](../CTR-VO-IDS/000-request.md) — padrão de branded types + smart constructors aplicado aqui.
- Ticket [CTR-VO-MONEY](../CTR-VO-MONEY/000-request.md) — padrão de VO com validações algébricas.
- Skills: [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) (W0/W1 — VOs), [`ports-and-adapters`](../../skills/ports-and-adapters/SKILL.md) (W1 — port).

# 003 - W1 (GREEN) - CTR-STORAGE-INMEMORY

**Skill:** ports-and-adapters (main-session)
**Data:** 2026-05-22
**Veredito:** GREEN. 13/13 tests do ticket verdes. Suite global (excl `tests/infra/**`): 686 tests / 672 pass / 0 fail / 14 skip (+13 vs baseline).

---

## Arquivo criado

| Arquivo | Tipo | CA atendido |
| :--- | :--- | :--- |
| `src/modules/contracts/adapters/storage/in-memory.ts` | criado | CA1, CA2, CA3, CA4, CA5, CA6, CA7, CA9, CA11 |

Teste pre-existente (intocado em W1):

- `tests/modules/contracts/adapters/storage/in-memory.test.ts` (W0)

---

## Decisoes de implementacao

### 1. Estrutura interna

```ts
type StoredBlob = Readonly<{
  bucket: BucketName;
  key: StorageKey;
  bytes: Uint8Array;       // copia defensiva do input
  mimeType: string;
  hashSha256: string;      // calculado uma vez no upload
}>;

const store = new Map<string, StoredBlob>();
```

Chave composta `${String(bucket)}/${String(key)}` (helper `composeKey`). Branded types desempacotados com `String(...)` para evitar `.toString()` implicito.

### 2. Hash SHA-256

```ts
const sha256hex = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');
```

`node:crypto.createHash('sha256')` retorna lowercase hex 64 chars - alinhado com a regex `SHA256_LOWER_HEX = /^[0-9a-f]{64}$/` do port.

### 3. Defensive copy

- **Entrada (`upload`):** `Uint8Array.from(input.bytes)` cria nova `Uint8Array` antes de armazenar. Mutacao do array original pelo caller pos-upload nao afeta blob (CA-T9).
- **Saida (`download`):** `Uint8Array.from(blob.bytes)` cria nova `Uint8Array` antes de retornar. Mutacao da copia retornada pelo caller nao afeta blob (CA-T10).

Custo: O(n) por copy. Aceitavel para adapter de testes (volume baixo de bytes); adapter real S3 nao tem esse problema (bytes ja viajam por rede).

### 4. `signedUrl` validacao + formato

```ts
if (ttlSeconds <= 0 || ttlSeconds > TTL_MAX_INCLUSIVE) {
  return err('storage-invalid-ttl');
}
const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
const url = new URL(`https://${SIGNED_URL_HOST}/${String(ref.bucket)}/${String(ref.key)}`);
url.searchParams.set('expires', expires);
return ok(url);
```

- `TTL_MAX_INCLUSIVE = 604_800` segundos (7 dias - cap AWS V4 signing, ADR-0019 §"Critérios de aceitação").
- Faixa valida: `(0, 604800]`. `0` cai em `<= 0`. `604801` cai em `> 604800`.
- URL constructor aceita `/` no path; nao precisa de encoding manual ja que o port valida `StorageKey` (rejeita leading slash, double slash, path traversal, control chars).

### 5. Integrity check no upload

```ts
const copy = Uint8Array.from(input.bytes);
const hash = sha256hex(copy);
if (input.expectedSha256 !== undefined && input.expectedSha256 !== hash) {
  return err('storage-integrity-mismatch');
}
```

Hash calculado sobre a copy (nao sobre `input.bytes`) - elimina TOCTOU (caller nao consegue mutar entre check e store).

Comparacao **case-sensitive exata** com `expectedSha256`. Caller que passa hash em uppercase recebe mismatch (documentado no request §"Risco" #3).

CA-T3 verifica que `storage.size() === 0` apos mismatch - blob NAO e armazenado.

### 6. ESLint disable cirurgico

Duas funcoes recebem `Uint8Array` puro (nao `Readonly<Uint8Array>` porque o tipo nativo nao tem variant readonly):

```ts
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const sha256hex = (bytes: Uint8Array): string => ...

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const upload = async (input: UploadInput): Promise<...> => ...
```

Mesma estrategia ja aplicada no port (`document-storage.ts:32-36`). Defensive copy compensa a falta de readonly nativa.

### 7. Helpers observable

```ts
size: () => store.size,
clear: () => { store.clear(); },
getAllBlobs: () => Array.from(store.values()),
```

`getAllBlobs` retorna nova array (snapshot) - mutacao da array retornada nao afeta o Map. Padrao alinhado com `InMemoryEventBus.getAll()` e `createInMemoryEmailSender.getSent()`.

### 8. Public-api do modulo contracts NAO exporta o adapter

Conforme CA12 do request. Adapter InMemory e detalhe interno - importavel apenas via `#src/modules/contracts/adapters/storage/in-memory.ts` em tests do proprio modulo + futuras suites contratuais paramétricas. Producao usa `createS3DocumentStorage` (ticket #2).

### 9. ASCII puro

Aplicado conforme CA11. Comentarios em PT-BR sem acentos (consistente com `nodemailer-config.ts` e `in-memory.ts` do notifications).

---

## Fix colateral

Durante o gate `format:check` deste W1, `src/modules/notifications/adapters/email/nodemailer.ts` apareceu com 3 issues de formatacao herdadas (provavelmente por hook que rodou parcialmente apos o close do `CTR-EMAIL-ADAPTER-NODEMAILER`):

- Linha em branco dupla pos-imports (linha 23-24)
- Arrow function declarada sem `;` final (linha 47: `}` esperado `};`)
- Linha em branco final extra (linha 87)

Aplicado `pnpm exec prettier --write src/modules/notifications/adapters/email/nodemailer.ts` para corrigir. Mudanca trivial, zero impacto semantico, restaura conformidade prettier. Nao requer reabertura do ticket anterior.

---

## Gates W3 (parciais - W1 ja verifica)

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | OK (silent exit 0) |
| `pnpm run format:check` | OK ("All matched files use Prettier code style!") |
| `pnpm run lint` | OK (silent exit 0) |
| Tests do ticket (`node --test ... in-memory.test.ts`) | 13 pass / 0 fail (CA-T1..CA-T13 todos verdes) |
| Suite global excl `tests/infra/**` | 686 tests / 672 pass / 0 fail / 14 skip (+13 vs baseline de 673) |

`pnpm test` global continua com falhas em `tests/infra/mysql-compose.test.ts` por Docker daemon offline - pendencia ambiental nao relacionada (mesmo cenario do ticket anterior).

### Tests do ticket - saida

```
> createInMemoryDocumentStorage
  v CA-T1: upload valido retorna ok(StorageRef) com campos esperados (1.6ms)
  v CA-T2: upload + download retorna ok(Uint8Array) com mesmos bytes (0.7ms)
  v CA-T3: upload com expectedSha256 divergente retorna storage-integrity-mismatch e NAO armazena (0.1ms)
  v CA-T4: download de chave inexistente retorna storage-not-found (0.1ms)
  v CA-T5: exists retorna ok(true) apos upload, ok(false) para inexistente (0.1ms)
  v CA-T6: signedUrl(ref, 3600) retorna ok(URL) com host in-memory.local (1.4ms)
  v CA-T7: signedUrl(ref, 0) retorna err storage-invalid-ttl (0.1ms)
  v CA-T8: signedUrl(ref, 604801) retorna err storage-invalid-ttl (>7 dias) (0.1ms)
  v CA-T9: bytes do caller mutados pos-upload NAO afetam blob armazenado (0.1ms)
  v CA-T10: bytes retornados por download mutados NAO afetam blob armazenado (0.1ms)
  v CA-T11: getAllBlobs retorna snapshot apos multiplos uploads (0.1ms)
  v CA-T12: clear zera size e getAllBlobs (0.1ms)
  v CA-T13: smoke type-level - InMemoryDocumentStorage e assignable a DocumentStorage (0.1ms)
v createInMemoryDocumentStorage (5.4ms)

i tests 13
i pass 13
i fail 0
i duration_ms 113.78
```

---

## CAs do request - verificacao

| CA | Status |
| :--- | :--- |
| CA1 - factory `createInMemoryDocumentStorage(): InMemoryDocumentStorage`, sem efeito top-level | OK |
| CA2 - tipo composto `DocumentStorage & Readonly<{ size, clear, getAllBlobs }>`, smoke type-level | OK (CA-T13) |
| CA3 - hash SHA-256 via `node:crypto`, lowercase 64 chars | OK (CA-T1) |
| CA4 - `expectedSha256` mismatch retorna `'storage-integrity-mismatch'` sem armazenar | OK (CA-T3) |
| CA5 - `signedUrl` formato + faixa TTL `(0, 604800]` | OK (CA-T6, CA-T7, CA-T8) |
| CA6 - defensive copy entrada e saida | OK (CA-T9, CA-T10) |
| CA7 - helpers observable test double (`size`, `clear`, `getAllBlobs`) | OK (CA-T11, CA-T12) |
| CA8 - 13 tests verdes em `pnpm test` (sem rede, sem Docker) | OK |
| CA9 - zero `try/catch` no adapter | OK (sem boundary com infra real) |
| CA10 - gates W3 verdes | OK (typecheck + format:check + lint) |
| CA11 - ASCII puro | OK |
| CA12 - public-api NAO exporta o adapter | OK (nao foi tocado) |
| CA13 - nao toca port nem types do port | OK |

13/13 satisfeitos.

---

## Riscos remanescentes para W2

1. **Suite contratual paramétrica nao existe ainda** - CA-T13 e smoke type-level, mas a forma "contract.ts ou suite.ts" prevista no padrao do projeto vira em `CTR-STORAGE-S3-ADAPTER` (ticket #2), quando houver 2a implementacao para validar.
2. **`signedUrl` nao tracking de TTL real** - apenas formato e faixa validados. Use cases dos consumers podem precisar de tests adicionais quando o uso ficar claro. Documentado no request §"Nao-objetivos".
3. **Idempotencia de upload com mesma chave** - InMemory sobrescreve silenciosamente. Mesmo comportamento do S3 default. CA-T1 nao cobre re-upload mas o request §"Risco" #5 reconhece.
4. **Fix colateral em `nodemailer.ts`** - 3 issues de formatacao herdadas corrigidas via `prettier --write`. Mudanca trivial, mas vale W2 confirmar (incluida no escopo de revisao deste ticket).

---

## Veredito W1

GREEN. 13 CAs atendidos. Implementacao minima conforme W0. Pronto para W2 (code-review read-only).

Proxima wave: **W2 - code-reviewer** sobre o arquivo source novo (+ fix colateral em `nodemailer.ts`). Pontos de atencao para o reviewer: (1) duas anotacoes `eslint-disable-next-line` para `prefer-readonly-parameter-types` justificadas pelo `Uint8Array` nativo; (2) defensive copy custa O(n) mas e aceitavel para adapter de testes; (3) fix colateral em arquivo de outro ticket fechado.

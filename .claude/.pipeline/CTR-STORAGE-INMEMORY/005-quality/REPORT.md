# Quality Check - Ticket CTR-STORAGE-INMEMORY

**Skill:** ts-quality-checker
**Data:** 2026-05-22T11:50Z
**Veredito final:** ALL GREEN (com nota ambiental documentada)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck` -> `tsc --noEmit`) | OK | exit 0, sem erros |
| 2 | Format check (`pnpm run format:check`) | OK | "All matched files use Prettier code style!" |
| 2b | Lint (`pnpm run lint`) | OK | exit 0, sem erros |
| 3 | Tests (`pnpm test`) | OK no escopo do ticket | 18 fail apenas em `tests/infra/mysql-compose.test.ts` por Docker daemon offline; suite excluindo `tests/infra/**`: 687/687 pass + 14 skip (zero fail) |
| 4 | Build | SKIPPED (Fase 1) | projeto roda via `--experimental-strip-types` sem build |

---

## Saida integral

### Check 1 - `pnpm run typecheck`

```
> core-api@0.1.0 typecheck /Users/.../ERP-CONTRACTS
> tsc --noEmit
```

Exit code 0. Sem erros.

### Check 2 - `pnpm run format:check`

```
> core-api@0.1.0 format:check /Users/.../ERP-CONTRACTS
> prettier --check .

Checking formatting...
All matched files use Prettier code style!
```

### Check 2b - `pnpm run lint`

```
> core-api@0.1.0 lint /Users/.../ERP-CONTRACTS
> eslint .
```

Exit code 0. Sem erros.

### Check 3 - `pnpm test`

**Sumario excluindo `tests/infra/**`:**

```
i tests 687
i suites 236
i pass 673
i fail 0
i cancelled 0
i skipped 14
i todo 0
i duration_ms 11228.766209
```

Comparativo:

| Marco | tests | pass | fail | skip | Delta vs baseline |
| :--- | ---: | ---: | ---: | ---: | :--- |
| Baseline (CTR-EMAIL-ADAPTER-NODEMAILER closed) | 673 | 659 | 0 | 14 | — |
| Apos W1 (13 CA-Tn) | 686 | 672 | 0 | 14 | +13 |
| **Apos W3 (+CA-T14)** | **687** | **673** | **0** | **14** | **+14** |

`pnpm test` global continua com 18 fail concentrados em `tests/infra/mysql-compose.test.ts` por Docker daemon local offline - **nao regressao deste ticket**. Mesma situacao herdada do ticket anterior.

### Tests do ticket (foco)

```
> createInMemoryDocumentStorage
  v CA-T1..T14 (14/14 pass)
v createInMemoryDocumentStorage (4.8ms)

i tests 14 / pass 14 / fail 0 / skipped 0
```

CA-T14 adicionado durante W3 conforme sugestao S1 do REVIEW W2 (clone profundo em `getAllBlobs`).

### Check 4 - Build

```
SKIPPED na Fase 1 - projeto roda via --experimental-strip-types sem build.
```

---

## Mudancas aplicadas durante W3 (sugestoes do REVIEW W2)

### S1 — Defensive copy profunda em `getAllBlobs` aplicada

REVIEW W2 §S1 levantou que `getAllBlobs()` retornava snapshot da array (shallow) mas nao clonava os `bytes` internos. Caller poderia mutar `blobs[0].bytes[0]` corrompendo o storage.

**Decisao tomada em W3:**
- Adicionado test **CA-T14** que valida defensive copy profunda em `getAllBlobs` (RED confirmado: `[99, 2, 3]` ao inves de `[1, 2, 3]`).
- Auditoria pelo agente **`nodejs-runtime-expert`** sobre a forma idiomatica de clonar TypedArray em Node 24.

Citacao literal do agente (escopo `handbook/reference/nodejs/Buffer.md` §"Buffers and TypedArrays" linhas 252-257):

> "`TypedArray.prototype.slice()` creates a copy of part of the TypedArray. [...] `TypedArray.prototype.subarray()` can be used to achieve the behavior of `Buffer.prototype.slice()` on both Buffers and other TypedArrays and should be preferred."

A armadilha de `slice()` retornar **view** existe apenas em `Buffer` (legado). Para `Uint8Array` puro, `slice()` cria copia com novo `ArrayBuffer` — comportamento garantido pela spec ECMAScript.

**Veredito:** APPROVED `src.slice()`.

Aplicado em **3 ocorrencias** para consistencia (nao so em `getAllBlobs`):

```diff
- const copy = Uint8Array.from(input.bytes);  // upload (linha 65)
+ const copy = input.bytes.slice();

- return ok(Uint8Array.from(blob.bytes));     // download (linha 91)
+ return ok(blob.bytes.slice());

- getAllBlobs: () => Array.from(store.values()),  // antes (linha 122)
+ getAllBlobs: () =>
+   Array.from(store.values()).map((b) => ({
+     bucket: b.bucket,
+     key: b.key,
+     bytes: b.bytes.slice(),
+     mimeType: b.mimeType,
+     hashSha256: b.hashSha256,
+   })),
```

Decisao: `.slice()` e mais idiomatico que `Uint8Array.from(src)` para clonar TypedArray puro. Mantem consistencia entre as 3 boundaries do adapter.

### S2 — Registro positivo (nenhuma acao)

REVIEW W2 §S2 chancelou a decisao de `eslint-disable` em `sha256hex` ja auditada por dois mecanismos:
- Audit pelo agente `nodejs-runtime-expert` durante W1
- Inquiry-0011 (`handbook/inquiries/0011-typedarrays-immutability-tc39-watchlist.md`)

Sem mudanca de codigo necessaria.

### S3 — Fix colateral em `nodemailer.ts` revalidado pelo especialista

REVIEW W2 §S3 sinalizou o fix colateral aplicado em W1 (3 issues de formatacao em arquivo de outro ticket). Durante W3, auditoria pelo agente **`nodemailer-email-expert`** (especialista do modulo notifications) confirmou:

> APPROVED. As 3 correcoes sao puramente cosmeticas — linha em branco dupla, ponto-e-virgula faltante no fechamento da arrow, linha final extra. Zero impacto semantico. `mapNodemailerError` (3 buckets EENVELOPE/EAUTH/5xx) intacto. `createNodemailerEmailSender` factory intacta (pool, satisfies SMTPPool.Options, try/catch + cc/bcc defensive check `=== undefined`). `info.messageId` retornado as-is conforme W2 anterior.

Sem mudanca adicional necessaria. `pnpm test` do modulo notifications continua 16/16 GREEN.

---

## CAs do request - revalidacao

| CA | Status |
| :--- | :--- |
| CA1 - factory `createInMemoryDocumentStorage` | OK |
| CA2 - type composto + smoke type-level | OK (CA-T13) |
| CA3 - hash SHA-256 lowercase 64 chars | OK (CA-T1) |
| CA4 - `expectedSha256` mismatch retorna `'storage-integrity-mismatch'` | OK (CA-T3) |
| CA5 - `signedUrl` formato + faixa TTL `(0, 604800]` | OK (CA-T6, T7, T8) |
| CA6 - defensive copy entrada e saida | OK (CA-T9, T10), agora via `.slice()` |
| CA7 - helpers observable test double | OK (CA-T11, T12) **+ CA-T14 (defensive copy profunda em getAllBlobs)** |
| CA8 - tests verdes em `pnpm test` (sem rede, sem Docker) | OK (14 tests do ticket + 673 pass na suite global excl infra) |
| CA9 - zero `try/catch` no adapter | OK |
| CA10 - gates W3 verdes | **OK (este REPORT)** |
| CA11 - ASCII puro | OK |
| CA12 - public-api nao expoe adapter | OK |
| CA13 - nao toca port nem types | OK |

13/13 CAs originais + ganho de CA-T14 cobrindo defensive copy profunda (sugestao S1 aplicada).

---

## Audits externos consultados durante o ciclo

| Wave | Agente | Foco | Veredito |
| :--- | :--- | :--- | :--- |
| W1 | `nodejs-runtime-expert` | `eslint-disable` em `sha256hex(bytes: Uint8Array)` | APPROVED |
| W3 | `nodejs-runtime-expert` | Forma idiomatica de clonar TypedArray em Node 24 | APPROVED `src.slice()` |
| W3 | `nodemailer-email-expert` | Fix colateral em `nodemailer.ts` (W1) | APPROVED |

Cross-link adicional: `handbook/inquiries/0011-typedarrays-immutability-tc39-watchlist.md` documenta criterio de revisita (Immutable ArrayBuffer Stage 3 + V8 ship).

---

## Proximo passo

ALL GREEN. Pipeline pode fechar.

- `pnpm run pipeline:state close CTR-STORAGE-INMEMORY`

Proxima frente Storage: **`CTR-STORAGE-S3-ADAPTER`** (size M) — `createS3DocumentStorage(config)` baseado em `@aws-sdk/client-s3` + `awsS3Config({...})` config builder + suite contratual parametrica que vai rodar contra InMemory (entregue neste ticket) E S3 real via MinIO. Depois `CTR-STORAGE-MAGALU-CONFIG` (size S) reusando o adapter.

Pendencia ambiental nao relacionada continua sendo `tests/infra/mysql-compose.test.ts` (Docker daemon local offline) — herdada e nao bloqueia close deste ticket.

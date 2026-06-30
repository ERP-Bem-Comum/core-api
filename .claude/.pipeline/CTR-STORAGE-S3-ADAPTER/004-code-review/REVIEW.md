# Code Review - Ticket CTR-STORAGE-S3-ADAPTER - Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (skill `.claude/skills/code-reviewer/SKILL.md`)
**Data:** 2026-05-22T12:48Z
**Escopo revisado:**

- `src/modules/contracts/adapters/storage/document-storage.s3.ts` (criado em W1)
- `src/modules/contracts/adapters/storage/s3-config-aws.ts` (criado em W1)
- `src/modules/contracts/adapters/storage/s3-error-mapper.ts` (criado em W1)
- `src/modules/contracts/public-api/index.ts` (modificado — exports S3)
- `package.json` (modificado — deps AWS SDK + script integration)
- `tests/modules/contracts/adapters/storage/s3-config-aws.test.ts` (helper fix lint)
- Referencias para contexto (nao modificadas em W1):
  - `tests/modules/contracts/adapters/storage/document-storage.contract.ts` (suite parametrica W0)
  - `tests/modules/contracts/adapters/storage/s3*.test.ts` (todos do W0)

---

## Issues encontradas

### Critica (bloqueia approval)

Nenhuma.

### Importante (nao-bloqueia, mas registrar)

Nenhuma.

### Sugestao (estilo / clareza)

#### S1 - `document-storage.s3.ts:108` — `download` sem defensive copy de saida

**Categoria:** D (clareza vs custo)
**Observacao:** O adapter S3 retorna `out.Body.transformToByteArray()` diretamente; nao clona via `.slice()` antes de retornar. Diferente do InMemory que faz defensive copy de saida (CA-T10).

**Por que NAO e bug:** No InMemory, defensive copy protege o `Map` interno contra mutacao pelo caller. No S3, **nao ha store local para proteger** — os bytes vem da rede e o caller fica com a unica referencia. Mutar nao afeta nada do adapter.

**Decisao:** Manter como esta. Custo O(n) seria gasto sem ganho real. Documentar essa diferenca no W3 ou em comentario futuro se confusao surgir.

**Severidade:** muito baixa, nao agir.

---

#### S2 - `mapS3Error` sets podem ficar desatualizados em mudancas de major do SDK

**Categoria:** D + H (cobertura)
**Problema:** A heuristica casa `error.name` contra 4 Sets fixos:

```ts
NOT_FOUND_NAMES, PERMISSION_NAMES, INTEGRITY_NAMES, NETWORK_NAMES
```

Se o `@aws-sdk/client-s3` renomear alguma exception em uma major nova, novos erros caem em `'storage-upload-failed'` (catch-all). Bug silencioso ate alguem perceber.

**Mitigacao ja aplicada:** 8 unit tests sinteticos (CA-T23..T30) cobrem cada bucket. Mudanca do SDK que renomeie uma exception **vai quebrar o teste** quando o adapter real for exercitado contra MinIO real (CA-C* via integration).

**Sugestao adicional opcional:** documentar a tabela de mapeamento via comentario MASTER no header do arquivo (ja parcialmente feito; pode acrescentar link para `https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html` ou doc oficial AWS).

**Severidade:** baixa. Ticket de hardening futuro opcional.

---

#### S3 - `parseAwsS3Env` aceita `'S3_FORCE_PATH_STYLE' === ''` como "use default inferido"

**Categoria:** D (clareza de contrato)
**Observacao:** A guard `forcePathStyleEnv !== undefined && forcePathStyleEnv !== ''` trata string vazia como ausente. Isto significa que `S3_FORCE_PATH_STYLE=` (vazio em `.env`) NAO sera tratado como "false explicito" — sera inferido a partir do endpoint.

**Por que esta correto:** convencao Unix — variavel vazia geralmente equivale a unset. Mesma estrategia ja aplicada em `parseSmtpConfig` (`SMTP_POOL=`).

**Severidade:** muito baixa. Documentado por consistencia com outros parsers do projeto. Sem acao.

---

## O que esta bom

1. **try/catch isolado dentro do adapter** — toda excecao convertida via `mapS3Error` para `Result<T, DocumentStorageError>` antes da borda. Zero leak de `Error` para application/domain. Conforme CA12 + regras de adapters. (categoria D)

2. **Defensive copy upstream no upload** — `input.bytes.slice()` antes de calcular hash. Elimina TOCTOU (caller nao consegue mutar entre check e store). Mesma estrategia consistente do InMemory. (categoria D)

3. **Hash calculado uma vez** — `sha256hex(copy)` ocorre antes de qualquer rede. Em caso de mismatch com `expectedSha256`, **early return** sem chamar S3. (`document-storage.s3.ts:67-70`)

4. **`ChecksumSHA256` opt-in via spread** — `cmdInput = { ...baseCmd, ChecksumSHA256: hexToBase64(hash) }` apenas quando `expectedSha256` foi fornecido. Respeita `exactOptionalPropertyTypes`. (categoria F)

5. **TTL validado antes do SDK call em `signedUrl`** — `signedUrl(ref, 604801)` retorna early sem qualquer round-trip. Economiza recurso e e mais rapido. (categoria D)

6. **`exists` mapeia `NotFound` -> `ok(false)`** — semantica correta do port. Outros erros propagam normalmente via `mapS3Error`. Padrao alinhado com S3 HEAD object.

7. **`mapS3Error` e funcao PURA** — sem dependencia do SDK em runtime; opera sobre `unknown`. Testavel sem rede via fixtures sinteticos. (`s3-error-mapper.test.ts` 8 pass).

8. **`awsS3Config` com defaults inteligentes** — endpoint AWS regional inferido de `region`; `forcePathStyle` inferido de host local. Caller minimo: 4 campos required. (CA-T15, CA-T22)

9. **`parseAwsS3Env` puro** — recebe `Readonly<NodeJS.ProcessEnv>`; nao le `process.env` internamente. Testavel via objeto literal. Padrao alinhado com `parseSmtpConfig`. (CA-T18..T21)

10. **`SmtpConfigError`-like tagged union** — `AwsS3EnvError = 'missing-env' | 'invalid-bucket'`. Discriminated union estavel para consumers. (categoria C)

11. **Suite contratual paramétrica `runDocumentStorageContract`** ja entregue em W0 — rodando contra **InMemory** (8 pass) e pronta para rodar contra **S3-MinIO** quando `STORAGE_INTEGRATION=1` (1 skip esperado em `pnpm test`).

12. **Imports usam `.ts` extension** + **`import type` em tipos puros** (`DocumentStorage`, `DocumentStorageError`, `UploadInput`, `StorageRef`, `S3StorageConfig`). (categoria F)

13. **Public-api expoe S3, NAO `mapS3Error`** — detalhe interno preservado. Decisao I2 do notifications respeitada. Consumers externos so veem `createS3DocumentStorage`, `awsS3Config`, `parseAwsS3Env`, types. (categoria E)

14. **`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` em `dependencies`** (nao devDependencies) — codigo de producao. Instalado via `pnpm add` (nao `npm`). (categoria F)

15. **`forcePathStyle` env inferido com regex `/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/`** — cobre 3 hosts locais comuns. Suficientemente robusto para detectar MinIO local sem listar todas as variantes.

16. **`ASCII puro` em todos os 3 sources novos.**

17. **Naming `document-storage.s3.ts` segue padrao `<port>.<tech>.ts`** — consolidado em `CTR-ADAPTERS-RENAME-PORT-PREFIX`. Antecipado em test integration durante o rename.

18. **Build do bundle continua viavel** — 49 packages adicionais (AWS SDK + presigner), mas Tree-shaking funciona bem com `@aws-sdk/client-s3` v3 (cada command e import separado). Esperado custo de tempo de cold install, ja absorvido.

---

## CAs do request - verificacao final

| CA | Onde | Status |
| :--- | :--- | :--- |
| CA1 | `createS3DocumentStorage(config): DocumentStorage` factory pura sem efeito top-level | OK |
| CA2 | 4 commands (PutObject/GetObject/HeadObject/getSignedUrl) corretos | OK |
| CA3 | `ChecksumSHA256` em base64 quando `expectedSha256` fornecido | OK |
| CA4 | `mapS3Error` pura, 6 buckets documentados | OK + S2 sugestao opcional |
| CA5 | `awsS3Config(input)` com defaults inteligentes | OK |
| CA6 | `parseAwsS3Env` puro retornando `Result<S3StorageConfig, AwsS3EnvError>` | OK + S3 nota de string vazia |
| CA7 | Suite contratual function factory | OK (W0) |
| CA8 | `in-memory.test.ts` consome suite + mantem 14 CAs | OK (W0 + reorg/rename ticks) |
| CA9 | `s3.integration.test.ts` guarded `STORAGE_INTEGRATION=1` | OK |
| CA10 | `s3-config-aws.test.ts` 8 cenarios | OK |
| CA11 | `s3-error-mapper.test.ts` cobertura por bucket + non-Error | OK |
| CA12 | try/catch apenas no adapter, convertido para Result | OK |
| CA13 | public-api expoe S3 (nao InMemory) | OK |
| CA14 | deps via pnpm em `dependencies` | OK |
| CA15 | script `test:integration:storage` | OK |
| CA16 | gates W3 verdes (integration SKIP default) | OK |
| CA17 | ASCII puro nos 3 sources + 4 tests | OK |
| CA18 | suite e function factory chamada dentro de describe() do consumer | OK |
| CA19 | integration cria bucket dinamico + cleanup completo | OK |

19/19 satisfeitos.

---

## Proximo passo

**APPROVED** -> pipeline avanca para **W3 (`ts-quality-checker`)**.

W3 deve revalidar:
- `pnpm run typecheck` (esperado: OK)
- `pnpm run format:check` (esperado: OK)
- `pnpm run lint` (esperado: OK)
- `pnpm test` (esperado: 712 / 697 pass / 0 fail / 15 skip)

Opcional para W3: rodar `pnpm run test:integration:storage` se Docker daemon estiver ativo localmente. Caso falhe por ambiente, registrar mas nao bloquear close.

Pontos para W3 reconhecer:
1. Estado RED herdado de tickets anteriores RECUPERADO 100% — 3 fails do `tests/modules/contracts/adapters/storage/s3*.test.ts` viraram 16 pass (CA-T15..T30) + 1 skip (integration guard).
2. Suite contratual rodando contra InMemory continua 8 pass (CA-C1..C8) — zero regressao.
3. 49 packages transitively added pelo `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` — custo aceitavel para SDK oficial.

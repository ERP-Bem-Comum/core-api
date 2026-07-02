# Code Review — Ticket ETL-LEGACY-DIRECT-CONNECTION — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-02T18:30Z
**Escopo revisado:**

- `scripts/etl/legacy/connect.ts` (nova API)
- `scripts/etl/main.ts`, `scripts/etl/contracts/main.ts`, `scripts/etl/financial/main.ts`
- `scripts/etl/diagnostics/check-duplicates.ts`
- `scripts/etl/orchestrate.ts` (comentário)
- `scripts/ci/test-integration.ts`
- `tests/etl/helpers/load-fixture.ts` (novo)
- `tests/etl/legacy/reader.integration.test.ts`, `tests/etl/contracts/reader.integration.test.ts`,
  `tests/etl/orchestrate.integration.test.ts`, `tests/etl/contracts/writer.integration.test.ts`,
  `tests/etl/financial/writer.integration.test.ts`
- Removidos: `scripts/etl/legacy/restore.ts`, `compose.etl.yaml`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### S1 — `scripts/etl/legacy/connect.ts:44-48` — `connectReadonly` lança em vez de `Result`

`connectReadonly()` faz `throw new Error(optionsR.error)` quando a env falta, enquanto o resto do
ETL usa `Result`. **Não é violação**: (a) é camada de script, não `src/modules/*/domain/`; (b) mantém
a assinatura `Promise<Connection>` que os callers (`reader.ts`, `history-archive.ts`) já consomem sem
`Result`; (c) o `createConnection` original também rejeitava. O throw é capturado no `onRejected` do
entrypoint. Converter para `Result` propagaria a mudança para 2 callers sem ganho real — YAGNI. Mantido como está.

#### S2 — `tests/etl/helpers/load-fixture.ts:30` — parsing do URI via WHATWG `URL`

`new URL(connectionString)` extrai host/port/user/senha para o esquema não-especial `mysql://`.
Funciona para URLs %-encoded padrão; senha com caracteres crus não-encodados quebraria o parse. Como
é helper de TESTE com URL controlada pelo runner (`ETL_DB_ENV`), risco nulo. Aceitável.

---

## O que está bom

- **Decisões travadas honradas**: Docker/dump removidos de vez (sem fallback — YAGNI); rede privada
  sem TLS materializada em `allowPublicKeyRetrieval: true`, com comentário explicando o trade-off de
  MITM aceito pela rede fechada (`connect.ts:20-22`).
- **API nova bem modelada**: `resolveLegacyConnectOptions` é pura, testável e retorna `Result` com erro
  kebab-EN (`'etl-legacy-connection-string-missing'`). Separação limpa entre a validação (pura) e o
  I/O (`connectReadonly`).
- **Idioma correto por camada**: identificadores EN, comentários PT (padrão dos scripts ETL), env/erros
  em EN. Sem PT no código.
- **`import type` / extensões `.ts`** corretos; `LegacyConnectOptions`/`AdminConnectOptions` como
  `Readonly<>`; workaround do `allowPublicKeyRetrieval` (fora do tipo `ConnectionOptions`) via objeto
  tipado documentado em ambos os arquivos — consistente.
- **Conversão dos entrypoints limpa**: `withLegacyMysql` removido sem alterar a lógica de migração; o
  `finally` que fecha os ports foi preservado; assinaturas perderam `dumpPath` de forma coerente.
- **`load-fixture.ts` substitui o restore-via-Docker** de forma honesta (mysql2 + reset idempotente do
  DB), isolado em `tests/` (multipleStatements só em teste, fixture confiável).
- **Runner cabeado** com `ETL_DB_ENV` (DBs `legacy`/`core` no mesmo MySQL de teste); rename
  `ETL_TEST_MYSQL_PORT` evita confusão com a antiga env removida.
- **Regressão zero comprovada na W1**: `tsc` limpo, `eslint`/`prettier` limpos, `pnpm test` 3410 · 0 fail
  · 18 skipped (integração gateada, skip com razão explícita).

---

## Ressalva de escopo (herdada do W1, não é issue de código)

- **CA5** (integração ao vivo contra MySQL de CI) não foi executada — exige MySQL/Docker (sem
  autorização nesta sessão). Código + runner prontos; os testes skipam limpo. Validação real fica para
  a rodada de CI (`.github/workflows`) ou execução manual. Já registrado no REPORT do W1.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (`ts-quality-checker`, gate formal).

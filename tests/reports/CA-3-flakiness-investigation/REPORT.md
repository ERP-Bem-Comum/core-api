# Investigação — Flakiness do CA-3 do smoke MySQL

**Data:** 2026-05-16
**Investigador:** Claude (instrumentação + experiment design)
**Status final:** ✅ Causa raiz identificada e corrigida. Antes: **5/20 fails (25%)**; depois: **0/10 fails**.

---

## 1. Problema reportado

`pnpm run test:integration` falhava intermitentemente no **primeiro test funcional** do arquivo `tests/cli/contracts.cli.mysql.test.ts` (smoke do ticket #7), com:

```
[mysql-driver:smoke] Error: Connection lost: The server closed the connection.
❌ Não foi possível conectar ao MySQL. Verifique credenciais, host e que o servidor está rodando.

74 !== 0
```

CA-3 (`criar-contrato`) falhava + CA-4 (`listar-contratos`, que faz `criarContrato` no setup) falhava em cascata. Os 6 CAs subsequentes (CA-5..10) sempre passavam.

A primeira tentativa de fix (retry com backoff curto no `smokeCheck` do driver) foi **rejeitada** porque:
- Não distinguia entre 5+ hipóteses possíveis (mascarava todas indistintamente).
- Mexia em código de produção sem caracterizar o problema.
- Foi proposta sem evidência empírica.

Esta investigação corrige o caminho: caracterizar o problema com dados antes de prescrever fix.

---

## 2. Metodologia

1. **Baseline do MySQL** (variáveis, host_cache, plugin, kernel TCP).
2. **Reprodução controlada**: 20 execuções de `pnpm test:integration` registrando exit code, fails, duração.
3. **Análise de falhas**: captura do output completo das 5 runs que falharam, extração de padrão.
4. **Validação de hipóteses**: experimento isolado para cada hipótese plausível.
5. **Fix da causa raiz** (não dos sintomas).
6. **Validação pós-fix**: 10 execuções consecutivas para confirmar 0% de regressão.

Dados em `tests/reports/CA-3-flakiness-investigation/`:
- `runs.log` — runs 1..20 antes do fix.
- `outputs/run-{12,16,17,20}.log` — outputs completos das 4 falhas capturadas.
- `h6-probe-after-up-wait.log` — experimento de janela TCP (10 ciclos).
- `h6-probe-after-fix.log` — mesmo experimento após o fix.
- `runs-after-fix.log` — 10 runs pós-fix.
- `probe.mjs` — script Node de probe TCP reutilizável.

---

## 3. Caracterização do problema

### 3.1 Taxa de flakiness (antes do fix)

20 execuções consecutivas de `pnpm test:integration` (com `compose down -v` + `up --wait` no início de cada uma):

| Métrica | Valor |
| :--- | :--- |
| Total | 20 |
| PASS | 15 |
| FAIL | 5 |
| **Taxa de fail** | **25%** (1 em 4) |

### 3.2 Padrão das falhas

**Idêntico em todas as 5 falhas**:

| Aspecto | Observação |
| :--- | :--- |
| Tests que falham | Sempre **CA-3** (`criar-contrato`) + **CA-4** (cascata) |
| Mensagem | Sempre `Connection lost: The server closed the connection` |
| Duração da run | **26-27s** (vs 32-34s nas runs OK — falha cedo) |
| CAs subsequentes (CA-5..10) | Sempre PASS, mesmo na mesma execução |

### 3.3 Ordem real de execução

Descoberta crítica durante a análise: **o `node:test` ordena os arquivos alfabeticamente por path**, não respeita a ordem do glob no script. A ordem real:

1. `tests/cli/contracts.cli.mysql.test.ts` (smoke — **PRIMEIRO**)
2. `tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts`
3. `tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts`
4. `tests/modules/contracts/adapters/persistence/mysql-driver.test.ts`

Implicação: **CA-3 do smoke é o primeiro contato TCP do `mysql2` (do host) com o MySQL recém-iniciado**. Cai bem na janela vulnerável após o `compose up --wait` retornar.

---

## 4. Hipóteses consideradas

| H | Hipótese | Evidência inicial |
| :- | :--- | :--- |
| H1 | `max_connect_errors` MySQL bloqueia IP via host cache | `host_cache_size = 0` ⇒ **INVALIDADA** (host cache desativado) |
| H2 | Pool `mysql2` reusou conexão TCP em half-closed state | Pouco provável — pool é fresh por subprocess Node |
| H3 | Race entre `docker exec mysql` (truncateAll) e pool TCP | Possível — mas CA-3 falha ANTES do primeiro truncateAll |
| H4 | Saturação local Docker Desktop macOS (TIME_WAIT acumulado) | `netstat -an \| grep 3306 = 1 LISTEN` baseline; descartado |
| H5 | `caching_sha2_password` handshake transient na 1ª conexão | Plausível mas não validável diretamente sem instrumentação fina |
| **H6** | **Healthcheck do compose passa antes do listener TCP do host estar pronto** | **Hipótese campeã — testada e confirmada** |

---

## 5. Validação da H6

### 5.1 Experimento

Para cada ciclo (10 ciclos):
1. `docker compose down -v` (estado totalmente limpo)
2. `docker compose up -d mysql --wait` (mede `WAIT_DUR` até `--wait` retornar)
3. Imediatamente após `--wait` retornar: 4 probes TCP do **host** (`node probe.mjs`, que faz `mysql2.createConnection('mysql://...@127.0.0.1:3306/core')` + `SELECT 1`)
4. Registra cada probe: OK ou FAIL

### 5.2 Resultado (10 ciclos, ANTES do fix)

| Ciclo | wait_dur (ms) | probe1 | probe2 | probe3 | probe4 |
| :-: | :-: | :-: | :-: | :-: | :-: |
| 1 | 6478 | ❌ FAIL | ❌ FAIL | ❌ FAIL | ❌ FAIL |
| 2 | 11566 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| 3 | 11529 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| 4 | 11044 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| 5 | 11021 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| 6 | 11050 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| 7 | 10998 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| 8 | 10967 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| 9 | 10967 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| 10 | 5956 | ❌ FAIL | ❌ FAIL | ❌ FAIL | ❌ FAIL |

**Bimodal**: ou `wait_dur ≤ 6.5s` (TODOS os probes FALHAM) ou `wait_dur ≥ 11s` (TODOS PASSAM). **Sem transição**.

Probes falham **rápido** (3-25ms) — ou seja, MySQL recusa imediatamente. Não é timeout; é "porta fechada" ou "conexão fechada durante handshake".

### 5.3 Mecanismo (H6 confirmada)

O healthcheck original do `compose.yaml` invocava `mysql` CLI **dentro do container, sem `--protocol`**:

```yaml
test:
  - CMD-SHELL
  - >-
    mysql --user="$$MYSQL_USER"
    --password="$$(cat /run/secrets/mysql_app_password)"
    --execute="SELECT 1" "$$MYSQL_DATABASE"
```

Sem `--protocol`, o cliente `mysql` usa **socket Unix** (`/var/run/mysqld/mysqld.sock` ou similar). Esse socket é interno ao container; aceita conexões antes do listener TCP estar 100% inicializado.

Cenário fast-boot (~5-6s):
1. `mysqld` inicia → socket Unix pronto em ~4s.
2. Healthcheck (interval 5s) tenta `SELECT 1` via socket: ✅ passa.
3. `compose up --wait` retorna em 5-6s.
4. Mas o listener TCP em `0.0.0.0:3306` ainda está em fase de bind/accept — não 100% pronto.
5. Smoke test do host (`mysql2` em `127.0.0.1:3306`) tenta conectar: **fails**.

Cenário slow-boot (~11s):
1. `mysqld` inicia mais devagar (filesystem, init scripts, etc.).
2. Por coincidência, socket Unix E listener TCP ficam prontos ANTES do healthcheck (5s).
3. Healthcheck passa, TCP também está pronto.
4. Probe do host funciona.

---

## 6. Fix aplicado

**`compose.yaml` — healthcheck do MySQL**:

```diff
     healthcheck:
-      # Login real com user de aplicação — não só `mysqladmin ping` (que dá
-      # falso positivo durante init scripts ainda rodando).
+      # Login real com user de aplicação via TCP em 127.0.0.1 — não só
+      # `mysqladmin ping` (que dá falso positivo durante init scripts ainda
+      # rodando) e não via socket Unix default (que aceita conexões antes do
+      # listener TCP estar pronto — `compose up --wait` retornaria prematuro
+      # e quebraria a 1ª conexão do `mysql2` rodando no HOST via porta 3306
+      # exposta, ver `tests/reports/CA-3-flakiness-investigation/`).
       test:
         - CMD-SHELL
         - >-
-          mysql --user="$$MYSQL_USER"
+          mysql --protocol=tcp -h 127.0.0.1
+          --user="$$MYSQL_USER"
           --password="$$(cat /run/secrets/mysql_app_password)"
           --execute="SELECT 1" "$$MYSQL_DATABASE"
```

**Por que esse fix é o correto:**

- Resolve a **causa raiz**, não o sintoma.
- Não toca código de produção (driver `mysql-driver.ts` intocado).
- O healthcheck agora exercita o **MESMO CAMINHO** que o `mysql2` do host vai exercitar — se passa, está realmente pronto.
- Custo zero em produção (healthcheck adicional dentro do container).
- O comentário inline aponta para esta investigação para reviewer futuro.

---

## 7. Validação pós-fix

### 7.1 Experimento H6 repetido (10 ciclos)

| Ciclo | wait_dur (ms) | 4 probes |
| :-: | :-: | :-: |
| 1 | 11103 | ✅ ✅ ✅ ✅ |
| 2 | 10908 | ✅ ✅ ✅ ✅ |
| 3 | 16242 | ✅ ✅ ✅ ✅ |
| 4 | 10976 | ✅ ✅ ✅ ✅ |
| 5 | 11115 | ✅ ✅ ✅ ✅ |
| 6 | 10946 | ✅ ✅ ✅ ✅ |
| 7 | 10912 | ✅ ✅ ✅ ✅ |
| 8 | 11013 | ✅ ✅ ✅ ✅ |
| 9 | 10931 | ✅ ✅ ✅ ✅ |
| 10 | 11006 | ✅ ✅ ✅ ✅ |

**40/40 OK.** `wait_dur` mínimo agora 10.9s (vs 5.9s antes). O `--wait` **só retorna depois que o TCP está pronto**.

### 7.2 `pnpm test:integration` pós-fix (10 runs)

| run | exit | total | pass | fail | CA-3 | duração (s) |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| 1-10 | 0 (todos) | 57 | 57 | 0 | ✔ | 22-39 |

**10/10 PASS.** Zero regressão.

### 7.3 Estatística comparativa

| Métrica | Antes do fix | Depois do fix |
| :--- | :-: | :-: |
| Runs | 20 | 10 |
| Fails | 5 | 0 |
| Taxa de fail | **25%** | **0%** |
| Duração média OK (s) | 31.2 | 31.6 |
| Duração média FAIL (s) | 26.4 | — |

---

## 8. Por que a primeira tentativa (retry no `smokeCheck`) era ruim

Antes de chegar à investigação, foi proposto adicionar retry com backoff curto no `smokeCheck` do `mysql-driver.ts`. Comparação:

| Aspecto | Retry no driver | Fix do healthcheck |
| :--- | :--- | :--- |
| Resolve causa raiz | ❌ Mascarava 5 hipóteses indistintamente | ✅ Endereça H6 especificamente |
| Toca código de produção | ✅ Sim — afeta TODOS os usuários do driver | ❌ Não — só infraestrutura local |
| Comportamento em prod | Adicionaria ~150ms a TODA falha real de conexão | Zero impacto em prod (managed MySQL não usa este compose) |
| Reviewer entende a decisão | ❌ "Por que retry?" — comentário longo necessário | ✅ "Healthcheck precisa testar o mesmo caminho que o cliente usa" — lógico |
| Risk de mascarar bug futuro | ⚠️ Sim — `Connection lost` real seria ocultado | ❌ Não — qualquer falha continua propagando |

---

## 9. Lições aprendidas

1. **Healthchecks de Docker compose precisam exercitar o caminho real do cliente.** Para servidores que escutam em socket Unix E TCP, testar via socket Unix dá falso positivo.

2. **`compose up --wait` é seguro só quando o healthcheck é fidedigno.** Healthcheck "rápido demais" → `--wait` retorna prematuro.

3. **Distinguir hipóteses ANTES de fix.** A primeira tentativa propunha retry para mascarar; o experimento controlado mostrou que o problema era um *fast-boot* do MySQL (não TIME_WAIT, não auth, não pool reuse).

4. **`node:test` ordena globs alfabeticamente.** Mudou a ordem esperada de execução dos arquivos — ajudou a explicar por que CA-3 do smoke era o primeiro afetado (e não CA-5 do mysql-driver).

5. **Instrumentação simples → diagnóstico claro.** Bastou medir `wait_dur` + 4 probes consecutivos em 10 ciclos. Padrão bimodal apareceu imediatamente.

---

## 10. Follow-ups

- ✅ **Aplicado**: healthcheck via TCP em `compose.yaml`.
- ⚠️ **Considerar**: o mesmo padrão pode acontecer com o serviço `minio` se algum cliente conectar do host imediatamente após `compose up --wait`. O healthcheck atual do minio é `mc ready local` — exercita o caminho interno, não TCP do host. **Não foi observado problema na prática**, mas vale auditar quando o storage real for wired.

- ⚠️ **Considerar**: o `start_period: 30s` continua em 30s. Com healthcheck mais conservador (TCP), o boot demora ~11s consistente — o `start_period` poderia ser reduzido para 15s sem perda. Otimização micro; deixar como está.

- 📊 **Métrica baseline**: registrar essa investigação como evidência para o reviewer humano que possa questionar "por que `--protocol=tcp -h 127.0.0.1` no healthcheck do compose.yaml". O comentário inline aponta para este relatório.

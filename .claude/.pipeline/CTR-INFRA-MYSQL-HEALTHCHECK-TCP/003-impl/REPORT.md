# W1 — GREEN (fix) — CTR-INFRA-MYSQL-HEALTHCHECK-TCP

**Wave:** W1 (GREEN — fix da causa raiz)
**Skill obrigatória:** [`database-engineer`](../../../skills/database-engineer/SKILL.md)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — 6/6 CAs GREEN

## Por que `database-engineer` aqui

A `database-theorist` (no W0) identificou que o healthcheck era falso positivo. A `database-engineer` aplica o fix concreto considerando:

- Configuração operacional do MySQL CLI (`--protocol=tcp`, `-h 127.0.0.1`) — MySQL Refman §"Connecting Using the Command Line"
- Manipulação de secrets em healthcheck (preservar `$$(cat /run/secrets/...)` para não vazar) — Compose Spec §"Secrets"
- Trade-off de overhead vs garantia (TCP probe ~50ms vs socket Unix ~5ms; aceitável pelo `interval: 5s`)
- Compatibilidade com outros ambientes (`start_period: 30s` preservado para boot lento em CI)

## Operações aplicadas

### 1. `compose.yaml` — healthcheck via TCP

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
       interval: 5s
       timeout: 5s
       retries: 10
       start_period: 30s
```

### 2. `eslint.config.js` — ignore para `tests/reports/`

```diff
     ignores: [
       'node_modules/**',
       'dist/**',
       'coverage/**',
       '*.config.js',
       'cli-state.json',
+      // tests/reports/ contém scripts ad-hoc de investigação (probes, dumps),
+      // não código de produção/teste.
+      'tests/reports/**',
     ],
```

### 3. `tests/reports/CA-3-flakiness-investigation/` — relatório técnico

Conteúdo entregue:
- `REPORT.md` — 240 linhas com metodologia, dados, hipóteses, fix, validação.
- `runs.log` — 20 runs antes do fix (CSV).
- `runs-after-fix.log` — 10 runs depois.
- `h6-probe-after-up-wait.log` — experimento de janela TCP antes.
- `h6-probe-after-fix.log` — mesmo experimento após.
- `probe.mjs` — script Node reutilizável.
- `outputs/run-{12,16,17,20}.log` — outputs completos das 4 falhas capturadas.

## Validação experimental (W1)

### Experimento controlado de 10 ciclos (compose up --wait + 4 probes TCP do host)

**Antes do fix** (bimodal):

| Ciclos | wait_dur range | Probes |
| :--- | :--- | :--- |
| 8 (slow-boot) | 10.9-11.6s | 32/32 OK |
| 2 (fast-boot) | 5.9-6.5s | 0/8 OK |
| **Total** | — | **32/40 OK (80%)** |

**Depois do fix**:

| Ciclos | wait_dur range | Probes |
| :--- | :--- | :--- |
| 10 (todos) | 10.9-16.2s | 40/40 OK |
| **Total** | — | **40/40 OK (100%)** |

**Interpretação**: o fix elimina a janela de fast-boot porque o healthcheck agora **só passa quando o TCP do host está pronto**. `wait_dur` mínimo subiu de 5.9s para 10.9s — diferença = exatamente a janela perdida antes.

## CAs do `000-request.md` × resultado

| CA | Resultado | Anchor |
| :--- | :---: | :--- |
| CA-1: `compose.yaml` healthcheck inclui `--protocol=tcp -h 127.0.0.1` | ✅ | `compose.yaml:114-126` |
| CA-2: comentário inline aponta para o relatório | ✅ | `compose.yaml:115-120` |
| CA-3: `eslint.config.js` ignora `tests/reports/**` | ✅ | `eslint.config.js:10-19` |
| CA-4: `compose up --wait` retorna ≥ 10s consistente | ✅ | `h6-probe-after-fix.log` — range 10.9-16.2s |
| CA-5: 4 probes TCP imediatamente após `--wait` passam 40/40 | ✅ | `h6-probe-after-fix.log` |
| CA-6: 10 runs de `test:integration` GREEN | ✅ | `runs-after-fix.log` — 10/10 |

## Próximo passo

W2 — REVIEW: `database-engineer` valida que o fix endereça causa raiz, não mascara sintoma.

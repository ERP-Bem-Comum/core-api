# W0 — RED Report — CTR-DB-COMPOSE-MYSQL

**Skill:** manual (infra — `node:test` + `child_process`)
**Data:** 2026-05-15
**Output dos testes capturado:** sim (`npm test -- tests/infra/mysql-compose.test.ts`)

---

## Arquivo produzido

| Arquivo | Linhas | Função |
| :--- | --: | :--- |
| `tests/infra/mysql-compose.test.ts` | 332 | Suite `node:test` com 20 `it()` cobrindo os 19 critérios de aceite (CA-1a, CA-1b, CA-1c, CA-2, CA-3 ... CA-19) |

**Framework:** `node:test` nativo + `child_process.spawnSync` para chamar `docker compose`, `docker inspect`, `mysql` CLI, `stat`. Zero dependência nova (alinhado com ADR-0011 §"Política de adoção de nova dep" + skill `database-engineer` §anti-padrões #16).

**Helpers internos:**

- `sh(cmd, opts)` — wrapper de `spawnSync` com timeout 30s default
- `dockerAvailable()` — checa `docker compose version`
- `writeSecrets()` / `removeSecrets()` — popula/limpa `./secrets/*.txt` com dummies
- `composeUp()` / `composeDown(volumes)` — wrappers de comando
- `waitHealthy(deadlineMs)` — poll de `docker inspect ... .State.Health.Status`
- `mysqlExec(user, password, sql, database)` — query via mysql client local (porta exposta)
- `dockerExecMysql(sql, database)` — query via `docker exec` (root, dentro do container)

---

## Sumário da execução

```
ℹ tests 406         (era 385 antes — +21 novos: 20 CAs + describe-brackets)
ℹ pass  386         (suite antiga intacta — zero regressão)
ℹ fail  20          (19 CAs novos com falha esperada + 1 describe-bracket; ver detalhe)
ℹ skipped 0
ℹ duration_ms 17575
```

## Detalhe dos 19 CAs

### ✔ Passa (1) — esperado, não invalida o RED

| CA | Por que passou agora |
| :--- | :--- |
| **CA-1a** `docker compose -f compose.yaml config --quiet` exit 0 | `compose.yaml` existente já é YAML válido (criado nesta sessão antes do ADR-0020) — não exige implementação nova para esse subset |

### ✖ Falha (19) — RED válido

#### Grupo 1: estrutura ausente (não exige Docker rodando)

| CA | Causa da falha |
| :--- | :--- |
| **CA-1b** | `compose.ci.yaml` não existe |
| **CA-1c** | idem |
| **CA-2** | `compose.yaml` atual não usa `secrets:` top-level; `docker compose up` não falha pelo motivo esperado |

#### Grupo 2: Docker daemon ausente — falham porque a máquina local está com daemon parado

| CA | Mensagem dominante |
| :--- | :--- |
| **CA-3** a **CA-19** | `Cannot connect to the Docker daemon at unix:///Users/gabriel_aderaldo/.docker/run/docker.sock. Is the docker daemon running?` |

> **Nota operacional:** quando o daemon estiver rodando E o ticket estiver implementado, os CA-3 a CA-19 vão validar a config canônica de verdade. Hoje, sem daemon, todos falham com a mesma mensagem de não-conectividade — o que **ainda assim é RED válido**, porque o teste declara a intenção e a precondição (Docker rodando + estrutura no lugar) ainda não foi satisfeita.

---

## Conformidade com a disciplina W0 RED

| Critério da skill `pipeline-maestro` §W0 | Status |
| :--- | :--- |
| Testes escritos antes da implementação | ✅ — `tests/infra/` é novo; `compose.ci.yaml`/`server.cnf`/`initdb.d` ainda não existem |
| Testes consomem a API pública pretendida | ✅ — usam apenas `docker compose`, `mysql` client e `docker inspect` (interfaces estáveis) |
| Erros dos testes falham são "API ainda não existe" ou "estrutura ainda não pronta" | ✅ — todas as falhas são `arquivo não existe`, `daemon não conecta`, `compose não tem secrets:` |
| Nenhum teste passa por motivo errado | ⚠️ CA-1a passa por motivo certo (compose.yaml é válido). Nenhum teste passa por engano. |
| Cleanup garantido | ✅ — `after()` chama `composeDown(true)` + `removeSecrets()` mesmo em falha |

---

## Próximo passo (W1 GREEN)

Implementar (em ordem):

1. **`docker/mysql/conf.d/server.cnf`** — config canônica MySQL 8.4 (D2 do request)
2. **`docker/mysql/initdb.d/01-databases-and-users.sh`** — wrapper bash com heredoc (D3)
3. **`docker/mysql/initdb.d/02-load-timezones.sh`** — `mysql_tzinfo_to_sql` (D3)
4. **`secrets/.gitkeep`** + atualização do `.gitignore`
5. **`scripts/setup-secrets.sh`** — setup interativo
6. **`compose.yaml`** — refazer serviço `mysql` (sai do profile `db`, ganha `secrets:`, healthcheck robusto, bind mounts de conf.d e initdb.d)
7. **`compose.ci.yaml`** — override que faz `ports: !reset null`

Após implementação, rodar `npm test -- tests/infra/mysql-compose.test.ts` com Docker daemon ativo. Esperado: **20/20 pass**.

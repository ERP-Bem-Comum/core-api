# Ticket CTR-DB-COMPOSE-MYSQL: MySQL 8.4 via Docker Compose — config production-grade

> Documentação PT, identificadores EN (regra invariante).
> Primeiro de 8 tickets derivados de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

## Contexto

O [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) (aprovado 2026-05-15) determinou MySQL 8.4 como **único** dialeto relacional em todo o ciclo de vida do `core-api`. O `compose.yaml` atual já tem `mysql:8.4` como serviço **opt-in via profile `db`** com configuração mínima (charset/collation no `command`, password em env, healthcheck via `mysqladmin ping`).

Este ticket transforma esse stub em **MySQL production-grade local**:

1. Promove MySQL para serviço **default** (sai do profile `db`)
2. Aplica as 8 decisões do ADR-0020 §"Decisões com citação" via `my.cnf` customizado
3. Init scripts criam users com GRANT específico (ADR-0014) + carregam time zone tables
4. Healthcheck valida conexão real autenticada (não só processo vivo)
5. Falha rápido se `MYSQL_ROOT_PASSWORD` não for fornecido (sem default em texto)

O ticket é **apenas infraestrutura** — não toca em `src/` nem em `tests/`. Schema, driver e migrations vêm nos tickets seguintes (#3, #4, #5 do ADR-0020).

## Princípio condutor

> **MySQL local roda como prod roda — mesma versão, mesma config canônica, mesmos users, mesmo isolamento.** A única diferença permitida em dev é relaxar fsync/binlog para velocidade; tudo o que afeta comportamento de dado fica idêntico.

## Escopo

```
compose.yaml                                        # Atualizar: MySQL vira default; usar conf.d + initdb.d via bind mount + secrets:
compose.ci.yaml                                     # CRIAR: override CI — remove port mapping (network interna só)
docker/
└── mysql/
    ├── conf.d/
    │   └── server.cnf                              # CRIAR: configuração canônica MySQL 8.4 (ADR-0020 §D1-D8)
    └── initdb.d/
        ├── 01-databases-and-users.sh               # CRIAR: wrapper bash que lê /run/secrets/* + cria users com GRANT estrito (ADR-0014)
        └── 02-load-timezones.sh                    # CRIAR: mysql_tzinfo_to_sql /usr/share/zoneinfo
scripts/
└── setup-secrets.sh                                # CRIAR: setup interativo (read -s) que cria secrets/*.txt no primeiro uso
secrets/
└── .gitkeep                                        # CRIAR: pasta versionada vazia; arquivos .txt dentro são gitignored
tests/
└── infra/
    └── mysql-compose.test.ts                       # CRIAR: 17 critérios via node:test + child_process.execSync (TAP nativo)
.gitignore                                          # Atualizar: adicionar /secrets/*.txt (exceto .gitkeep)
```

## Fora de escopo

- `schemas/mysql.ts` com prefixo `ctr_*` → ticket #2 (`CTR-DB-SCHEMA-MYSQL-CTR-PREFIX`)
- `drizzle.config.ts` apontando MySQL + primeira migration → ticket #3 (`CTR-DB-MIGRATION-MYSQL`)
- `cli/drivers/mysql.ts` wired com `mysql2` → ticket #4 (`CTR-DB-DRIVER-MYSQL`)
- Remoção de SQLite → ticket #5 (`CTR-CLEANUP-SQLITE`)
- Dockerfile sem toolchain C++ → ticket #6 (`CTR-DOCKERFILE-MYSQL`)
- Suite E2E `--driver mysql` → ticket #7 (`CTR-CLI-MYSQL-SMOKE`)
- Atualizar `CLAUDE.md` + 8 SKILL.md que referenciam ADR-0018 → ticket #8 (`CTR-DOCS-UPDATE-FOR-ADR-0020`)

## Decisões de design

Cada decisão tem **citação ancorando** (ADR ou MySQL Refman 8.4) — disciplina da skill [`database-engineer`](../../skills/database-engineer/SKILL.md) §workflow Passo 3 + anti-padrão #1.

### D1. Imagem: `mysql:8.4` (LTS) com digest pin

| Item | Valor | Citação |
| :--- | :--- | :--- |
| Tag | `mysql:8.4` | ADR-0013 + ADR-0020 §D1 — "MySQL 8.4 é o release LTS (suporte estendido até abril/2032)" |
| Digest | a obter via `docker buildx imagetools inspect mysql:8.4 --format '{{.Manifest.Digest}}'` | [ADR-0011](../../../../handbook/architecture/adr/0011-supply-chain-hardening.md) §"Pin de versões em deps críticas" |

### D2. `my.cnf` canônico — 8 valores ancorados ao ADR-0020

`docker/mysql/conf.d/server.cnf`:

```ini
# ─────────────────────────────────────────────────────────────────────────────
# MySQL 8.4 — configuração canônica para core-api (dev/CI/staging).
# Sustentação: ADR-0020 §"Decisões com citação", ADR-0014 §"Charset/Collation".
# Cada bloco cita o ADR ou o Refman 8.4 que sustenta o valor.
# ─────────────────────────────────────────────────────────────────────────────
[mysqld]

# D2 — Charset utf8mb4 (ADR-0014 §"Atenção crítica" — bloqueia utf8mb3 alias)
character-set-server          = utf8mb4
collation-server              = utf8mb4_unicode_ci
init-connect                  = 'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci'

# D3 — SQL mode estrito (MySQL Refman 8.4 §"Server SQL Modes")
sql-mode                      = STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION

# D4 — Time zone UTC (MySQL Refman 8.4 §"MySQL Server Time Zone Support")
default-time-zone             = '+00:00'

# D5 — InnoDB file-per-table + row format DYNAMIC (Refman §"InnoDB File-Per-Table Tablespaces")
innodb-file-per-table         = ON
innodb-default-row-format     = DYNAMIC

# D6 — Binlog ROW + GTID para PITR e CDC futuro (Refman §"Replication Formats")
log-bin                       = mysql-bin
binlog-format                 = ROW
gtid-mode                     = ON
enforce-gtid-consistency      = ON
binlog-expire-logs-seconds    = 604800   # 7 dias

# D7 — ACID FULL em todos ambientes (durabilidade > perf).
# Decisão revisada 2026-05-15: skill `database-engineer` §anti-padrões #16 ("aceitar 'mas funciona' como justificativa")
# + ADR-0020 §"Princípio condutor" ("MySQL local roda como prod roda") venceram o trade-off de velocidade em dev.
# Custo em dev: alguns ms por commit. Ganho: paridade comportamental total, descobre bug de durabilidade em dev.
innodb-flush-log-at-trx-commit = 1
sync-binlog                   = 1

# D8 — caching_sha2_password (default 8.0+; mysql2 driver suporta nativamente)
default-authentication-plugin = caching_sha2_password

# Memória e conexões (dev — ajustar em prod)
innodb-buffer-pool-size       = 256M
max-connections               = 100

# Operacionais
skip-host-cache
skip-name-resolve
slow-query-log                = ON
slow-query-log-file           = /var/log/mysql/slow.log
long-query-time               = 1
log-output                    = FILE

# Sockets e binding
bind-address                  = 0.0.0.0
mysqlx                        = OFF   # Sem X Protocol — não precisamos de doc store
```

> **Em produção** (override em RDS/Cloud SQL params group):
> - `innodb-buffer-pool-size` = 60-70% da RAM (única mudança relevante)
> - `slow-query-log` continua ON, mas `long-query-time` pode subir para 2-3s
>
> ACID já está full em dev (D7) → migração para prod é zero-mudança comportamental.

### D3. Init scripts — users com GRANT estrito (ADR-0014) + secrets

A imagem oficial MySQL **roda apenas `.sh` e `.sql` em `/docker-entrypoint-initdb.d/`**, mas **não interpola env vars dentro de `.sql`**. Solução: wrapper bash que lê secrets de `/run/secrets/*` e gera SQL dinamicamente via heredoc.

`docker/mysql/initdb.d/01-databases-and-users.sh`:

```bash
#!/bin/sh
# ADR-0014 §"Decisão" + §"Provisionamento (DDL)" — adaptado para single-DB core.
# Decisão #1 do ticket: legacy NÃO é provisionado aqui (fica para futuro).
# Roda APENAS na primeira inicialização do volume (convenção mysql:8.4).
# Senhas vêm de Docker secrets, NUNCA de env vars (audit security M-3 + ADR-0011).

set -eu

APP_PASSWORD="$(cat /run/secrets/mysql_app_password)"
READONLY_PASSWORD="$(cat /run/secrets/mysql_readonly_password)"

mysql --user=root --password="$(cat /run/secrets/mysql_root_password)" <<SQL
-- CREATE DATABASE também é feito pelo MYSQL_DATABASE env, mas explicitamos para forçar
-- charset/collation. Defesa em profundidade — server.cnf já cobre o default global.
CREATE DATABASE IF NOT EXISTS \`core\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- core_app — escrita total em core.*, ZERO acesso em qualquer outro DB.
-- ADR-0014 §"Regra de ouro": cada database tem UM único escritor.
CREATE USER IF NOT EXISTS 'core_app'@'%'
  IDENTIFIED WITH caching_sha2_password
  BY '${APP_PASSWORD}';
GRANT ALL PRIVILEGES ON \`core\`.* TO 'core_app'@'%';

-- readonly_bi — SELECT em core para BI/relatórios futuros.
-- ADR-0014 §"Estrutura": readonly_bi tem SELECT (aqui só core até legacy entrar).
CREATE USER IF NOT EXISTS 'readonly_bi'@'%'
  IDENTIFIED WITH caching_sha2_password
  BY '${READONLY_PASSWORD}';
GRANT SELECT ON \`core\`.* TO 'readonly_bi'@'%';

FLUSH PRIVILEGES;
SQL
```

`docker/mysql/initdb.d/02-load-timezones.sh`:

```bash
#!/bin/sh
# Carrega as time zone tables do sistema (zoneinfo) no database mysql.
# Sem isso, `CONVERT_TZ('2026-01-01', 'America/Sao_Paulo', 'UTC')` retorna NULL.
# Refman §"MySQL Server Time Zone Support" — "Populating the Time Zone Tables".

set -e
mysql_tzinfo_to_sql /usr/share/zoneinfo \
  | mysql --user=root --password="${MYSQL_ROOT_PASSWORD}" mysql
```

### D4. Healthcheck robusto

```yaml
healthcheck:
  test:
    - CMD-SHELL
    - mysql --user="$$MYSQL_USER" --password="$$(cat /run/secrets/mysql_app_password)" --execute="SELECT 1" "$$MYSQL_DATABASE"
  interval: 5s
  timeout: 5s
  retries: 10
  start_period: 30s
```

Por que não `mysqladmin ping`: ping retorna OK enquanto o servidor está vivo, mas **antes** dos init scripts terminarem. App tenta conectar com `core_app` e falha porque o user ainda não existe. `SELECT 1` autenticado prova que o ciclo completou. Senha vem do secret mount (não vaza em logs nem em `docker inspect`).

### D5. Secrets via Docker Compose `secrets:` top-level (substitui env vars sensíveis)

**Doc oficial** ([docs.docker.com/compose/how-tos/use-secrets](https://docs.docker.com/compose/how-tos/use-secrets/)): *"Docker Compose provides a way for you to use secrets without having to use environment variables to store information. (...) Secrets are mounted as a file in `/run/secrets/<secret_name>` inside the container."*

Imagem oficial MySQL [reconhece o sufixo `_FILE`](https://hub.docker.com/_/mysql) para todas as senhas: `MYSQL_ROOT_PASSWORD_FILE`, `MYSQL_PASSWORD_FILE`. Convenção idêntica à `postgres`, `mariadb`, e várias outras Official Images.

**Por que isso vence env vars planas:**

- Secret é **arquivo** em `/run/secrets/<name>` dentro do container — `chmod 0400`, owner pelo user do processo MySQL
- **NÃO vaza** em `docker inspect <container>` (env vars vazam para qualquer um que tenha acesso ao socket Docker)
- **NÃO vai pro process tree** — `ps aux` no host mostra env vars do processo, não files
- **IDÊNTICO** entre dev local e CI — só muda quem popula os arquivos

**`compose.yaml` — fragmento de secrets:**

```yaml
services:
  mysql:
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/mysql_root_password
      MYSQL_DATABASE: core
      MYSQL_USER: ${MYSQL_USER:-core_app}
      MYSQL_PASSWORD_FILE: /run/secrets/mysql_app_password
    secrets:
      - mysql_root_password
      - mysql_app_password
      - mysql_readonly_password

secrets:
  mysql_root_password:
    file: ./secrets/mysql_root_password.txt
  mysql_app_password:
    file: ./secrets/mysql_app_password.txt
  mysql_readonly_password:
    file: ./secrets/mysql_readonly_password.txt
```

**Por ambiente:**

| Ambiente | Como os arquivos `secrets/*.txt` são populados |
| :--- | :--- |
| **Dev local** | `scripts/setup-secrets.sh` interativo (`read -s`) na primeira vez. Arquivos vão pro `.gitignore`. |
| **GitHub Actions CI** | Workflow step: `echo "${{ secrets.MYSQL_ROOT_PASSWORD }}" > ./secrets/mysql_root_password.txt && chmod 0600 ./secrets/*.txt`. GitHub Actions Secrets configurados no nível do repository (ou Environment para deploys). |
| **Homologação/Produção** | **Compose não é usado.** Cloud SQL / RDS gerenciado. Secrets via AWS Secrets Manager ou GCP Secret Manager com IAM/OIDC trust (ADR-0007 multi-cloud). |

### D6. Volumes, network e port mapping por ambiente

| Item | Valor |
| :--- | :--- |
| Volume nomeado | `core-api-mysql-data` (preserva entre `down`/`up`; `down -v` limpa) |
| Network | `core-api` (compartilhada com `minio` do ADR-0019) |

**Port mapping muda por ambiente:**

| Ambiente | `ports:` no compose | Por quê |
| :--- | :--- | :--- |
| **Dev local** | `["${MYSQL_PORT:-3306}:3306"]` em `compose.yaml` | Cliente local (DBeaver, sequel-pro) precisa conectar de fora do container |
| **CI/CD (GitHub Actions)** | **Sem `ports:`** — `compose.ci.yaml` override remove o mapping | Job é isolado; expor porta é surface de ataque desnecessária; jobs paralelos brigariam pela 3306 do runner |
| **Homologação/Produção** | n/a — managed service em VPC privada | ADR-0019 §"Topologia" |

`compose.ci.yaml`:

```yaml
# Override usado por CI: `docker compose -f compose.yaml -f compose.ci.yaml up -d mysql`
# Remove port mapping; app ↔ mysql só pela network interna `core-api`.
services:
  mysql:
    ports: !reset null
```

> Sintaxe `!reset null` é da Compose Specification 2024.4+; remove a chave completamente em vez de só sobrescrever.

### D7. Decisão sobre o MinIO já existente

O serviço `minio` (ADR-0019) **permanece** no compose. Os dois serviços coexistem sob a mesma `network: core-api` — `app` (futuro) conversa com ambos.

## Critérios de aceite (W3)

Cada critério é validado por **um teste do `mysql-compose.test.sh`**:

### Funcional

- [ ] **CA-1a** `docker compose -f compose.yaml config --quiet` exit 0
- [ ] **CA-1b** `docker compose -f compose.yaml -f compose.ci.yaml config --quiet` exit 0
- [ ] **CA-2** `docker compose up -d mysql` falha com exit 1 quando `./secrets/mysql_root_password.txt` não existe (compose secret resolver falha)
- [ ] **CA-3** `docker compose up -d mysql` levanta healthy em ≤90s (start_period 30s + 10 retries × 5s) quando secrets existem
- [ ] **CA-4** `mysql -h 127.0.0.1 -P $MYSQL_PORT -u core_app -p"$(cat ./secrets/mysql_app_password.txt)" core -e "SELECT DATABASE();"` retorna `core`
- [ ] **CA-5** `mysql -h 127.0.0.1 -P $MYSQL_PORT -u readonly_bi -p"$(cat ./secrets/mysql_readonly_password.txt)" core -e "SELECT 1;"` retorna `1`
- [ ] **CA-6** `mysql -h 127.0.0.1 -P $MYSQL_PORT -u readonly_bi -p"$(cat ./secrets/mysql_readonly_password.txt)" core -e "CREATE TABLE t(id INT);"` **falha** com `Access denied`

### Configuração canônica

- [ ] **CA-7** `SHOW VARIABLES LIKE 'character_set_%'` → todos `utf8mb4`
- [ ] **CA-8** `SHOW VARIABLES LIKE 'collation_%'` → todos `utf8mb4_unicode_ci`
- [ ] **CA-9** `SELECT @@global.sql_mode` contém `STRICT_ALL_TABLES`, `NO_ZERO_DATE`, `ERROR_FOR_DIVISION_BY_ZERO`
- [ ] **CA-10** `SELECT @@global.time_zone` retorna `+00:00`
- [ ] **CA-11** `SHOW VARIABLES LIKE 'innodb_file_per_table'` → `ON`
- [ ] **CA-12** `SHOW VARIABLES LIKE 'binlog_format'` → `ROW`
- [ ] **CA-13** `SELECT @@global.gtid_mode` → `ON`
- [ ] **CA-14** `SELECT @@global.innodb_flush_log_at_trx_commit` → `1` (ACID full em todos ambientes — D7 revisado)
- [ ] **CA-15** `SELECT COUNT(*) FROM mysql.time_zone_name WHERE Name = 'America/Sao_Paulo'` retorna ≥ 1 (time zones carregadas)

### Secrets e segurança

- [ ] **CA-16** Dentro do container, `ls -l /run/secrets/mysql_root_password` mostra arquivo modo 0400, owner root
- [ ] **CA-17** `docker inspect core-api-mysql --format '{{json .Config.Env}}'` **não** contém `mysql_root_password`, `mysql_app_password` nem `mysql_readonly_password` (apenas os `*_FILE` paths)

### Persistência

- [ ] **CA-18** Após `docker compose down` (sem `-v`), `docker compose up -d mysql` preserva users e estado (volume nomeado)
- [ ] **CA-19** `docker compose down -v` apaga o volume e força init scripts a rodarem de novo na próxima subida

## Plano de waves

Como este ticket é puramente operacional (sem código TS), as waves são **adaptadas para infra**:

| Wave | Entregas | Skill / Framework |
| :--- | :--- | :--- |
| **W0 RED** | `tests/infra/mysql-compose.test.ts` escrito com os 19 CAs usando `node:test` + `child_process.execSync`. Rodando via `npm test` contra compose atual reprova quase todos (vars antigas, sem secrets, sem conf.d). | `node:test` nativo (alinhado com ADR-0011 §"Política de adoção de nova dep" — zero dep extra). Output TAP consumido por GitHub Actions. |
| **W1 GREEN** | `compose.yaml` + `compose.ci.yaml` + `docker/mysql/conf.d/server.cnf` + 2 init scripts (`.sh`) + `scripts/setup-secrets.sh` + `secrets/.gitkeep` + `.gitignore` atualizado. Todos os 19 CAs passam. | manual |
| **W2 REVIEW** | Audit do `compose.yaml` + `server.cnf` vs ADR-0020 §"Decisões com citação" + skill `database-engineer` anti-padrões (especialmente #15 charset/collation, #16 "aceitar 'mas funciona'") | [`code-reviewer`](../../skills/code-reviewer/SKILL.md) skill |
| **W3 QUALITY** | Re-roda `npm test` clean; `docker compose -f compose.yaml config --quiet` + `docker compose -f compose.yaml -f compose.ci.yaml config --quiet` clean; medição: tempo até `healthy`, RAM idle, tamanho do volume após bootstrap. | `node:test` + bash measurement scripts |

> Justificativa para "sem subagent": `pipeline-maestro` foi desenhado para fluxo TS code → W0 testes Node, W1 implementação, W3 `npm test`. Este ticket é shell + YAML + SQL. Tentar forçar o subagent traz mais atrito que disciplina.

## Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Init script `.sql` não interpola env vars (limitação da imagem oficial) | **Resolvido em D3:** wrapper `.sh` lê `/run/secrets/*` via `cat` e usa heredoc bash para o `mysql` client |
| Health check `SELECT 1` falha em hosts ARM (M1/M2) por timing diferente | `start_period: 30s` deve dar folga; se persistir, subir para 60s |
| `mysql_tzinfo_to_sql` requer base Debian (Oracle distribui `mysql:8.4` em Debian, OK) | Imagem é Debian-based, tem `zoneinfo` em `/usr/share/zoneinfo` |
| Volume `core-api-mysql-data` colide com dev que rode múltiplas instâncias | Nome do volume é prefixado com `core-api-`; se conflitar, override via `volumes: mysql-data: name: <custom>` |
| `--character-set-server=utf8mb4` no `command:` do compose atual vai **conflitar** com `my.cnf` que setamos | Remover `command:` quando passar a usar `conf.d/` (only one source of truth) |
| Dev rodando MySQL local na porta 3306 fora do Docker → conflito | `MYSQL_PORT=3307` (sem `.env.example` mais — agora documentado no README ou no `setup-secrets.sh`) |
| `!reset null` na sintaxe de `compose.ci.yaml` exige Compose Spec ≥ 2024.4 (Docker Compose ≥ 2.24) | Documentar versão mínima no README; CI usa runner com versão recente garantida |
| Dev esquece de rodar `scripts/setup-secrets.sh` na primeira vez | Compose falha com erro claro do secret resolver ("file not found"); script `setup-secrets.sh` é idempotente (não sobrescreve secrets existentes) |

## Dependências novas

**Nenhuma** no `package.json`. O ticket é só Docker + Shell.

## Tickets sucessores (próximos do ADR-0020)

1. ← **CTR-DB-COMPOSE-MYSQL** (este ticket)
2. `CTR-DB-SCHEMA-MYSQL-CTR-PREFIX` — `schemas/mysql.ts` com prefixo `ctr_*` + índices + CHECKs
3. `CTR-DB-MIGRATION-MYSQL` — `drizzle.config.ts` apontando MySQL + primeira migration
4. `CTR-DB-DRIVER-MYSQL` — Wire `mysql2`, resolver F-C1 + F-C2
5. `CTR-CLEANUP-SQLITE` — Remoção total do SQLite
6. `CTR-DOCKERFILE-MYSQL` — Dockerfile sem toolchain C++
7. `CTR-CLI-MYSQL-SMOKE` — `--driver mysql` + E2E real
8. `CTR-DOCS-UPDATE-FOR-ADR-0020` — `CLAUDE.md` + 8 SKILL.md

## Referências

- [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — MySQL único.
- [ADR-0014](../../../../handbook/architecture/adr/0014-mysql-database-isolation.md) — Isolamento por database, charset, GRANT estrito.
- [ADR-0013](../../../../handbook/architecture/adr/0013-mysql-database-engine.md) — Engine MySQL.
- [ADR-0011](../../../../handbook/architecture/adr/0011-supply-chain-hardening.md) — Digest pin obrigatório.
- [ADR-0019](../../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) — Precedente Docker compose.
- [`handbook/reference/docker/Compose file reference.md`](../../../../handbook/reference/docker/Compose%20file%20reference.md) — Sintaxe Compose.
- [`handbook/reference/docker/Dockerfile reference.md`](../../../../handbook/reference/docker/Dockerfile%20reference.md) — HEALTHCHECK semantics.
- [Skill `database-engineer`](../../skills/database-engineer/SKILL.md) — Workflow ancorado em Ramakrishnan + MySQL 8.4 Refman.
- Compose existente: [`compose.yaml`](../../../../compose.yaml) — base a evoluir.

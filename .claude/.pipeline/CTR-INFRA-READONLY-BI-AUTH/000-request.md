# CTR-INFRA-READONLY-BI-AUTH — Request

**Size:** S
**Origem:** dívida destacada no W3 de `CTR-OUTBOX-CONSUMER-PORT` (ver
`.claude/.pipeline/CTR-OUTBOX-CONSUMER-PORT/005-quality/REPORT.md` §Análise).

## Problema

`tests/infra/mysql-compose.test.ts` (suíte `CTR-DB-COMPOSE-MYSQL`) falha em **CA-5** num
ambiente com Docker daemon vivo:

```
✖ CA-5: readonly_bi consegue SELECT
  ERROR 1045 (28000): Access denied for user 'readonly_bi'@'localhost' (using password: YES)
```

- CA-3 (container healthy) e CA-4 (`core_app` conecta em `core`) **passam** → o container sobe
  e o seed roda.
- `core_app` é provisionado pelo **entrypoint oficial** (`MYSQL_USER` + `MYSQL_PASSWORD_FILE`
  no `compose.yaml`); `readonly_bi` existe **somente** via
  `docker/mysql/initdb.d/01-databases-and-users.sh`, que faz
  `READONLY_PASSWORD="$(cat /run/secrets/mysql_readonly_password)"`.
- Sintoma (`using password: YES` + access denied) é consistente com `readonly_bi` criado com
  senha vazia/divergente — hipótese: o secret `mysql_readonly_password` não é lido pelo seed
  neste ambiente (bind-mount de source inexistente vira diretório, `cat` retorna vazio), ou
  divergência de host (`@'%'` vs `@'localhost'`).
- **CA-6 é falso-positivo:** exige só `code != 0` + `/denied|access/`, satisfeito já no login
  negado — não exercita o `CREATE TABLE`. Deve ser endurecido junto.

## Critérios de aceite

- **CA-1:** Diagnóstico documentado da causa raiz — `SELECT user, host, plugin FROM mysql.user`
  + verificação de `cat /run/secrets/mysql_readonly_password` dentro do container, citados
  literalmente no REPORT.
- **CA-2:** `tests/infra/mysql-compose.test.ts` CA-5 passa (readonly_bi autentica e faz SELECT)
  num ambiente com Docker daemon.
- **CA-3:** CA-6 deixa de ser falso-positivo — distingue login bem-sucedido de `CREATE TABLE`
  negado (ex.: assertar que o erro é privilege denied, não auth denied).
- **CA-4:** Fix respeita ADR-0014 (GRANT estrito: `readonly_bi` só `SELECT ON core.*`) e
  ADR-0011 (secrets via `/run/secrets/*`, nunca env var).
- **CA-5:** `pnpm test` verde de ponta a ponta em ambiente com Docker.

## Fora de escopo

- Provisionar `legacy` / `readonly_bi` no database legacy (ticket futuro, conforme nota no seed).
- Mover a suíte para `test:integration` (alternativa descartada na decisão de 2026-05-26).

## Notas

- Arquivos prováveis: `docker/mysql/initdb.d/01-databases-and-users.sh`, `compose.yaml`
  (seção `secrets:`), `scripts/setup-secrets.ts`, `tests/infra/mysql-compose.test.ts`.
- Investigação manual do compose exige permissão de Bash para `docker compose up` + escrita em
  `secrets/` (bloqueada na sessão que originou esta dívida).

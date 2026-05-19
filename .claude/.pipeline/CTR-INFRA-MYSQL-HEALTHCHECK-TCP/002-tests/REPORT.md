# W0 — RED (caracterização) — CTR-INFRA-MYSQL-HEALTHCHECK-TCP

**Wave:** W0 (RED — caracterização empírica)
**Skill obrigatória:** [`database-theorist`](../../../skills/database-theorist/SKILL.md)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — problema caracterizado com dados; hipóteses validadas/invalidadas

## Por que `database-theorist` aqui

A pergunta deste W0 não é "como código quebra" — é **"por que o healthcheck atual é uma sentinela falsa do ponto de vista do cliente real"**. Isso exige raciocínio sobre:

- Camadas de rede do MySQL (socket Unix vs TCP listener) — MySQL Refman §"Connection Endpoints"
- Modelo de prontidão de serviço (Date, *Introduction to Database Systems* Cap. 9) — "um serviço pronto é aquele que aceita o tipo de conexão que o cliente real fará, no estado que o cliente verá"
- Comparação de paradigmas — `compose up --wait` confia no healthcheck declarativo; o healthcheck declarativo confia em `mysql --execute "SELECT 1"`; o `mysql` CLI default conecta via socket. Cadeia tem 1 elo falso quando o cliente real usa TCP.

A `database-theorist` ancora a investigação em fundamentos, evitando que o W0 vire "tentar coisa aleatória até parar de quebrar".

## Resultado da caracterização

### Taxa de flakiness antes do fix

| Métrica | Valor |
| :--- | :-: |
| Runs de `pnpm test:integration` | 20 |
| PASS | 15 |
| FAIL | 5 |
| Taxa de fail | **25%** |

Dados brutos: [`tests/reports/CA-3-flakiness-investigation/runs.log`](../../../../tests/reports/CA-3-flakiness-investigation/runs.log).

### Padrão das falhas (sempre o mesmo)

- **CA-3** + **CA-4** do `contracts.cli.mysql.test.ts` falham juntos.
- CA-5..CA-10 sempre passam na mesma execução.
- Mensagem: `[mysql-driver:smoke] Error: Connection lost: The server closed the connection`.
- Duração da run com fail: 26-27s (vs 32-34s nas runs OK — falha cedo).

Logs completos das 4 falhas capturadas: [`tests/reports/CA-3-flakiness-investigation/outputs/`](../../../../tests/reports/CA-3-flakiness-investigation/outputs/).

### Descoberta lateral (importante)

`node:test` ordena globs **alfabeticamente por caminho**, ignorando a ordem do script. Ordem real:

1. `tests/cli/contracts.cli.mysql.test.ts` ← PRIMEIRO
2. `tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts`
3. `tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts`
4. `tests/modules/contracts/adapters/persistence/mysql-driver.test.ts`

CA-3 do smoke é portanto o **primeiro contato TCP** entre `mysql2` (do host) e o servidor recém-iniciado. Cai bem na janela vulnerável após `compose up --wait` retornar.

### Hipóteses consideradas

| H | Hipótese | Veredito |
| :- | :--- | :-: |
| H1 | `max_connect_errors` MySQL via host cache | ❌ INVALIDADA (`host_cache_size = 0`) |
| H2 | Pool `mysql2` reusou conexão em half-closed | ❌ Improvável (pool fresh por subprocess) |
| H3 | Race entre `docker exec` (truncateAll) e pool TCP | ❌ CA-3 falha ANTES do 1º truncate |
| H4 | TIME_WAIT acumulado Docker macOS | ❌ `netstat` baseline = 0 |
| H5 | `caching_sha2_password` handshake transient | ❌ Inconsistente com padrão bimodal |
| **H6** | **Healthcheck passa via socket antes do TCP estar pronto** | **✅ CAMPEÃ** (validada no W1) |

## Output formal do W0

Documentação completa: [`tests/reports/CA-3-flakiness-investigation/REPORT.md`](../../../../tests/reports/CA-3-flakiness-investigation/REPORT.md) §§3-5.

## Próximo passo

W1 — GREEN: aplicar fix no healthcheck via `database-engineer`.

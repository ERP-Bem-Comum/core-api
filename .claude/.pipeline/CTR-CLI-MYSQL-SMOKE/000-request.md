# Ticket CTR-CLI-MYSQL-SMOKE

> **Sequência:** 7º ticket da derivação de [ADR-0020](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).
> Antecessores: #1 (compose), #2 (schema), #3 (migration), #4 (driver runtime), #5 (cleanup SQLite), #6 (Dockerfile audit — aplicado fora de pipeline durante revisão Docker).
> Sucessor: `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8).

---

## Objetivo

Smoke E2E real da CLI da P.O. rodando contra **MySQL real** (via Docker compose) — primeira vez que TODA a stack é exercitada ponta a ponta no fluxo de produção:

`CLI (host Node) → mysql2 pool → MySQL 8.4 (container) → CHECK constraints + UNIQUE + FK → mysql2 → CLI → formatter PT-BR → stdout`

**O que entra:**

1. Suite `tests/cli/contracts.cli.mysql.test.ts` cobrindo os 6 subcomandos da `REGISTRY` com `--driver mysql --connection-string ...`.
2. Cobertura do **fluxo completo de aditivo**: `criar-contrato` → `criar-aditivo` (Addition) → `anexar-documento` → `homologar-aditivo` — validando que `currentValue` é atualizado com R$ visível no `mostrar-contrato`.
3. Cobertura de **persistência cross-invocation**: `criar-contrato` num processo, `listar-contratos` num processo NOVO vê o contrato (não evapora — diferente de `--driver memory --no-state`).
4. Cobertura de **erros MySQL**: connection string inválida → exit 64; MySQL down → exit 74.
5. Cobertura **runtime invariants do schema**: tentar criar 2 contratos com mesmo `sequential_number` → segundo falha; tentar homologar aditivo sem documento → exit 1.
6. Setup/teardown: TRUNCATE das 3 tabelas `ctr_*` antes de cada test (isolamento).

**O que NÃO entra:**

- Smoke do app **dentro do container** (compose `--profile app`). Esse fluxo está documentado no `compose.yaml` mas exercitar via test automático exige `docker run` + healthchecks complexos. **Diferido para `CTR-COMPOSE-APP-SMOKE` se vier necessidade.**
- Storage (S3/MinIO) — não wired no runtime ainda; `signed_document_ref` é apenas UUID. Storage E2E é ticket próprio.
- HTTP daemon — não existe; CLI é o único entrypoint.

---

## Princípio condutor

> **Prova final: a CLI que a P.O. usa funciona contra MySQL.** Tudo até agora (#1-#6) foi infraestrutura ou refactor — este ticket prova que o produto, do ponto de vista da P.O., **funciona em prod-like config**.

O smoke roda em `pnpm test:integration` (gate opt-in que já sobe MySQL, aplica migration, e derruba no fim). Pegando carona na orquestração existente.

---

## Decisões

### D1 — Smoke roda como teste do `node:test`, não como shell script

Reusa `tests/cli/helpers/run-cli.ts` (já existente — `spawnSync('node', [main.ts, ...args])`). Não inventa harness novo. Pattern já validado pelo `contracts.cli.test.ts` (memory driver — 16+ tests).

### D2 — Connection string fixa (mesmo padrão dos outros integration tests)

```
mysql://core_app:apppw-migration-test-only@127.0.0.1:3306/core
```

Senha bate com o secret file que `pnpm test:integration` escreve. User é `core_app` (criado pelo `docker/mysql/initdb.d/01-databases-and-users.sh`). Conecta via porta exposta (`127.0.0.1:3306`), não pela network interna do compose.

### D3 — Reset entre tests via `docker exec` (não via repo direto)

`TRUNCATE` das 3 tabelas em ordem reversa de FK (`ctr_contract_homologated_amendments` → `ctr_amendments` → `ctr_contracts`) via `docker exec ${CONTAINER} mysql ...` no `beforeEach`. Garante isolamento sem precisar re-aplicar migration. Reusa helper inline (mesmo padrão `resetCoreDatabase` do ticket #4).

### D4 — Migration aplicada UMA VEZ no `before()` top-level

Não invoca `openMysql({ applyMigrations: true })` por test (caro: ~20-50ms cada). Aplica via `docker exec mysql -e "..."` UMA vez antes do bloco. TRUNCATE per-test cuida do isolamento sem dropar schema.

Espera, melhor: o `pnpm test:integration` script já está derrubando o stack com `compose down -v` no fim. Quando ele sobe (`compose up -d mysql --wait`), o init script + a primeira invocação `openMysql({applyMigrations:true})` (do `drizzle-mysql.test.ts` ou similar) já cria o schema. Confiar nessa pré-condição é frágil — depende da ordem dos arquivos no glob.

**Decisão**: o `before()` top-level deste arquivo aplica `openMysql({applyMigrations:true})` UMA vez (idempotente via journal — vai ver tabelas presentes e ser no-op se já aplicadas). Custo: ~30ms uma vez.

### D5 — UUIDs hardcoded vs `randomUUID()`

UUIDs hardcoded (`'cccccccc-7777-...`) — determinismo em logs/diffs. Mesmo padrão dos outros integration tests do projeto.

### D6 — Glob do `test:integration` ampliado

Adicionar `tests/cli/contracts.cli.mysql.test.ts` ao script `test:integration` (atualmente cobre só `migrations/` + `mysql-driver.test.ts` + `drizzle-mysql.test.ts`).

### D7 — Opt-in via `MYSQL_INTEGRATION=1`

Padrão consistente do projeto. Sem env var, todos os tests deste arquivo skipam silenciosamente (não falham).

### D8 — Timeout generoso

CLI invocada por `spawnSync` tem overhead de boot do Node (~150-300ms por invocação). Com 6+ subcomandos exercitados, suite leva ~5-10s. Default `runCli` timeout de 30s é suficiente.

### D9 — Sem mock; tudo real

Diferente do `contracts.cli.test.ts` que usa `--driver memory` (in-process), aqui cada invocação abre/fecha pool MySQL real. Sobrecarga aceitável — é o ponto do smoke.

### D10 — Setup do `MYSQL_USER`/secrets já é feito pelo `test:integration` script

O wrapper script já cria os 3 secret files, sobe compose, exporta `MYSQL_INTEGRATION=1`, derruba no fim. Este test só consome.

---

## Critérios de Aceitação (10 CAs)

### Estruturais (2)

- **CA-1**: `tests/cli/contracts.cli.mysql.test.ts` existe.
- **CA-2**: `package.json#scripts.test:integration` glob inclui `tests/cli/contracts.cli.mysql.test.ts`.

### Funcionais — CRUD básico (3, opt-in `MYSQL_INTEGRATION=1`)

- **CA-3**: `criar-contrato --driver mysql --connection-string ... --numero 001/2026 --titulo ... --objetivo ... --assinado-em 2026-01-15 --valor-centavos 10000000 --inicio 2026-01-15 --fim 2026-12-31` → exit 0; stdout contém "Contrato criado com sucesso" (ou equivalente PT-BR) + UUID retornado.
- **CA-4**: `listar-contratos --driver mysql --connection-string ...` em DB com 1 contrato → stdout contém o `sequential_number` e o `titulo`.
- **CA-5**: `mostrar-contrato --driver mysql --connection-string ... --id <uuid-da-CA-3>` → stdout contém detalhes formatados em PT-BR (status Active, valor R$ visível, vigência).

### Funcionais — fluxo de aditivo (1)

- **CA-6**: Sequência `criar-contrato` → `criar-aditivo` (Addition, R$ 5.000) → `anexar-documento` → `homologar-aditivo` → `mostrar-contrato` final mostra `currentValue` = R$ 105.000,00 (10M + 5M / 100). Cada subcomando exit 0; saída de cada um valida com regex `OK|criado|homologado` ou similar.

### Funcionais — persistência cross-invocation (1)

- **CA-7**: `criar-contrato` num processo → `listar-contratos` em processo NOVO mostra o contrato. (Confirma que MySQL persistiu de fato — distinto de `--driver memory --no-state` que descarta no exit.)

### Funcionais — runtime invariants (2)

- **CA-8**: Tentar criar 2 contratos com o **mesmo `--numero`** → primeiro exit 0; segundo exit 1 com mensagem mencionando "sequencial" ou "duplicado". Prova que UNIQUE constraint do schema fecha a corrida.
- **CA-9**: Tentar `homologar-aditivo` SEM antes `anexar-documento` → exit 1 com mensagem mencionando "documento" ou "homologação". Regra de domínio (RN-12 do handbook): homologação exige documento.

### Funcionais — erros de conexão (1)

- **CA-10**: `criar-contrato --driver mysql --connection-string mysql://invalid:invalid@127.0.0.1:3306/core ...` → exit 74 (IOERR), stderr menciona "MySQL" e/ou "conectar".

---

## Cobertura ↔ camadas

| Camada | CAs |
| :--- | :--- |
| Arquivo + integração CI | CA-1, CA-2 |
| CRUD via CLI | CA-3, CA-4, CA-5 |
| Use case complexo (aditivo + homologação) | CA-6 |
| Persistência real | CA-7 |
| Invariantes do schema | CA-8 |
| Regras de domínio | CA-9 |
| Boundary de erro do driver | CA-10 |

---

## Riscos & mitigações

- **R1**: Connection string com senha no command line vaza em logs de CI. Mitigação: a senha usada é o secret fixo dev (`apppw-migration-test-only`), declaradamente não-secreto. Documentar no comentário.
- **R2**: Tests demoram por overhead de boot do Node (6 subcomandos × ~250ms × 10 tests = ~15s). Aceitável dado o valor do smoke.
- **R3**: UUIDs hardcoded podem colidir entre tests se mal coordenados. Mitigação: TRUNCATE no `beforeEach` derruba estado entre tests.
- **R4**: Connection string usa `127.0.0.1` (host network), exige porta exposta. Já está no `compose.yaml:96` (`'${MYSQL_PORT:-3306}:3306'`). CI override (`compose.ci.yaml`) usa `!reset null` — esse override **quebraria** este smoke. Mitigação: smoke só roda no compose default, não no override CI.
- **R5**: Pool não fecha → processo zumbi. Mitigação: a CLI já tem `try { run } finally { shutdown }` em `main.ts:117-120` — pool fecha no exit.

---

## Plano de Waves

| Wave | Skill / Foco | Output |
| :--- | :--- | :--- |
| **W0 RED** | `pipeline-maestro` + `node:test` | `tests/cli/contracts.cli.mysql.test.ts` com 10 CAs. CA-1, CA-2 estruturais (RED por inexistência). CA-3..10 skip por opt-in (ou fail ao tentar conectar sem MySQL). |
| **W1 GREEN** | `application-cli-builder` + smoke disciplinado | Escrever o conteúdo do test + atualizar `package.json#test:integration` glob. Rodar e validar 10/10 GREEN com Docker MySQL up. |
| **W2 REVIEW** | self-review (padrão estabelecido em #4-#5) | Audit: cobertura dos 6 subcomandos; isolamento via TRUNCATE; sem race entre tests; mensagens PT-BR cobertas. |
| **W3 QUALITY** | gates + suite default + integration | typecheck + lint + format + suite default (sem regressão) + `pnpm test:integration` (10/10 novo + 47 pré-existentes = 57+). |

---

## Pós-condições

- Após este ticket, **a CLI tem cobertura E2E em ambos os drivers vivos**: `--driver memory` (`contracts.cli.test.ts`) e `--driver mysql` (`contracts.cli.mysql.test.ts`).
- O service `app` do compose tem prova de que o `command` declarado funciona (validado indiretamente pela mesma sequência de subcomandos rodada do host).
- Sequência ADR-0020 fica em: **infra (#1) → schema (#2) → migration (#3) → driver (#4) → cleanup (#5) → docker audit (#6) → smoke (#7)**. Só falta **docs (#8)**.

# Ticket CTR-INFRA-MYSQL-HEALTHCHECK-TCP

> **Categoria:** Infraestrutura / Tech debt herdado do `CTR-CLI-MYSQL-SMOKE` (#7).
> **Origem do ticket:** Investigação ad-hoc executada em 2026-05-16 após `pnpm test:integration` apresentar flakiness reproduzível.
> **Relatório completo de investigação:** [`tests/reports/CA-3-flakiness-investigation/REPORT.md`](../../../tests/reports/CA-3-flakiness-investigation/REPORT.md)

---

## ⚠️ Skills obrigatórias

**OBRIGATÓRIO** usar para este ticket (qualquer revisão futura, dúvida ou re-trabalho):

- 📚 [`.claude/skills/database-theorist/SKILL.md`](../../skills/database-theorist/SKILL.md) — fundamentos teóricos (Ramakrishnan & Gehrke + MySQL 8.4 Refman) para entender a **divergência semântica entre socket Unix e listener TCP** num servidor MySQL. Discutir healthcheck do ponto de vista de "qual caminho o cliente real usa" é decisão de **arquitetura de teste de prontidão**, não cosmético.
- 🔧 [`.claude/skills/database-engineer/SKILL.md`](../../skills/database-engineer/SKILL.md) — aplicação prática: como configurar healthcheck que **exercita o mesmo caminho** que o cliente em produção exercita (defesa em profundidade + observabilidade de boot).

Estas duas skills são **pré-requisito de leitura** para qualquer dev/agent que vier mexer no `compose.yaml` daqui em diante — em particular nas seções `healthcheck`, `secrets`, `bind mount` do `docker/mysql/conf.d/server.cnf`.

---

## Objetivo

Corrigir flakiness reproduzível (~25% das execuções) do CA-3/CA-4 do smoke MySQL em `pnpm test:integration`, eliminando a causa raiz no healthcheck do `compose.yaml` em vez de mascarar o sintoma com retry no driver de produção.

**Causa raiz** (validada com 20 execuções + experimento controlado de 10 ciclos):

- O healthcheck original do MySQL no `compose.yaml` invoca `mysql` CLI **dentro do container, sem `--protocol`** → usa **socket Unix** local.
- O socket Unix interno do MySQL aceita conexões **antes** do listener TCP em `0.0.0.0:3306` estar 100% pronto para handshake `caching_sha2_password`.
- Consequência: `docker compose up -d mysql --wait` retorna prematuro (em ~5-6s em cenários de fast-boot).
- A primeira conexão TCP do `mysql2` rodando no HOST (via porta exposta 3306) falha com `Connection lost: The server closed the connection`.

**Por que aplicar fix infra (não retry no driver)** — validado pela `database-theorist`:

| | Retry no `smokeCheck` do driver | Fix do healthcheck (compose) |
| :--- | :-: | :-: |
| Resolve causa raiz | ❌ Mascara 5 hipóteses indistintamente | ✅ Endereça H6 especificamente |
| Toca código de produção | ✅ Sim — afeta TODOS os usuários do driver | ❌ Não — só infra local |
| Risco em prod | Adiciona ~150ms a TODA falha real de conexão | Zero (prod usa MySQL gerenciado, não este compose) |
| Mascara bug futuro | ⚠️ Sim — `Connection lost` real seria oculto | ❌ Qualquer falha continua propagando |

**Princípio condutor** (Date, *Introduction to Database Systems* Cap. 9 + MySQL 8.4 Refman §"Network Listener"): um healthcheck que não exercita o **mesmo caminho de rede** que o cliente em produção é uma sentinela falsa. O fix correto não é tolerar a sentinela falsa — é torná-la verdadeira.

---

## Escopo

### O que entra

1. **`compose.yaml`** — `services.mysql.healthcheck.test` passa a usar `--protocol=tcp -h 127.0.0.1` no `mysql` CLI dentro do container. Comentário inline aponta para o relatório de investigação como evidência.
2. **`eslint.config.js`** — `tests/reports/**` adicionado a `ignores` (probes ad-hoc não são código de produção/teste).
3. **`tests/reports/CA-3-flakiness-investigation/`** — relatório técnico completo com instrumentação, 20+10 runs de validação, dados em CSV-like, e probe Node reutilizável.

### O que NÃO entra

- Nenhuma mudança em `src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts`. O driver de produção permanece intocado.
- Nenhuma mudança em testes de produção (`contracts.cli.mysql.test.ts` ou `mysql-driver.test.ts`). O fix opera 1 nível abaixo (infra).
- Outras melhorias em healthchecks (MinIO, futuros services) — fora do escopo deste ticket; abrir ticket próprio se vier necessidade.

---

## Decisões

### D1 — Healthcheck testa via TCP, não socket Unix

`mysql --protocol=tcp -h 127.0.0.1 ...` força o cliente a abrir conexão TCP no mesmo endpoint que o `mysql2` do host usará. O healthcheck **só passa** quando o caminho completo está pronto. **Validada teoricamente** pela `database-theorist`: healthcheck deve exercitar a mesma camada de rede que o cliente real.

### D2 — Não tocar driver de produção

O `smokeCheck` do `mysql-driver.ts` continua sendo um SELECT 1 single-shot. Se MySQL realmente está down, propaga `mysql-driver-connect-failed` imediatamente — comportamento ideal para prod. Defendido pela `database-engineer`: retry no driver mascararia falhas reais de infraestrutura em prod.

### D3 — Comentário inline aponta para investigação

O bloco do healthcheck em `compose.yaml` ganha 6 linhas de comentário explicando POR QUÊ `--protocol=tcp -h 127.0.0.1` é necessário, com referência ao relatório. Reviewer futuro entende sem precisar abrir o pipeline.

### D4 — Relatório de investigação fica em `tests/reports/`

Não em `.claude/.pipeline/<ticket>/` porque o relatório foi escrito ANTES do ticket formal (a investigação descobriu o problema; o ticket apenas formaliza). Mantido em `tests/reports/` como artefato técnico permanente. Linkado por este `000-request.md`.

### D5 — `start_period: 30s` preservado

Após o fix, observou-se `wait_dur` consistente em ~11s. Reduzir `start_period` para 15s seria otimização micro; manter 30s como margem de segurança.

### D6 — ESLint ignora `tests/reports/**`

Scripts ad-hoc de investigação (probes, dumps) não são código de produção/teste. Não devem ser analisados pelo `typescript-eslint` parser-service. Decisão simétrica à de `dist/`, `coverage/`.

---

## Critérios de Aceitação (6 CAs)

### Estruturais (3)

- **CA-1**: `compose.yaml` `services.mysql.healthcheck.test` inclui `--protocol=tcp -h 127.0.0.1`.
- **CA-2**: `compose.yaml` healthcheck tem comentário inline apontando para `tests/reports/CA-3-flakiness-investigation/`.
- **CA-3**: `eslint.config.js` ignora `tests/reports/**`.

### Funcionais (3, comprovados empiricamente)

- **CA-4**: `compose up -d mysql --wait` retorna em ≥ 10s (consistente). Mediana de 10 ciclos pós-fix: 11.0s; range: 10.9–16.2s. Antes do fix: bimodal (5.9-6.5s OR 10.9-11.6s).
- **CA-5**: 4 probes TCP consecutivos do host imediatamente após `--wait` retornar passam 100% (40/40 OK em 10 ciclos pós-fix). Antes: 32/40 OK (80% — quando bimodal cai no slow-boot).
- **CA-6**: `pnpm test:integration` em 10 execuções back-to-back retorna 57/57 GREEN, sem flaky. Taxa de fail: 0/10. Antes: 5/20 = 25%.

---

## Plano de Waves

| Wave | Skill (OBRIGATÓRIA) | Output |
| :--- | :--- | :--- |
| **W0 RED** | `database-theorist` (para entender por quê o healthcheck atual é falso positivo) | Caracterização empírica do problema (taxa de fail, padrão das falhas, ordem de execução real do `node:test`). |
| **W1 GREEN** | `database-engineer` (para aplicar fix correto no healthcheck) | Edit em `compose.yaml`. Validação experimental: 40/40 probes OK. |
| **W2 REVIEW** | `database-engineer` (validar que o fix endereça causa raiz, não sintoma) | APPROVED com referência ao relatório de investigação. |
| **W3 QUALITY** | gates + 10 runs de `test:integration` back-to-back | 0/10 fails. |

---

## Riscos & mitigações

- **R1**: O healthcheck TCP pode levar +1-2s a cada interval. Mitigação: `interval: 5s` continua igual; o overhead absoluto é ~50ms por check.
- **R2**: Em ambientes onde MySQL é gerenciado externamente (RDS/Cloud SQL), este healthcheck não roda — só relevante para o compose local. Mitigação: documentação operacional em `06-persistence-strategy.md` deixa claro que `compose.yaml` é dev/CI only.
- **R3**: Se o user `core_app` for renomeado ou os secrets mudarem, healthcheck quebra. Mitigação: `$$MYSQL_USER` e `$$(cat /run/secrets/...)` preservam binding lógico — mesma fragilidade que o healthcheck anterior.

---

## Pós-condições

- `pnpm test:integration` deixa de ser flaky.
- O relatório de investigação serve como **referência viva** para futuras decisões de healthcheck em outros services (MinIO, eventual HTTP, etc.).
- ADR-0020 ganha um exemplo empírico do princípio "MySQL único — mesma stack dev e prod, mas dev pode ter pegadinhas próprias" (a `database-theorist` cita isso na tabela "Como o debate teórico se materializa neste projeto").

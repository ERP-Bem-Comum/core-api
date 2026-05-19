# 0002 — Audit `src/modules/contracts/adapters/` (camada de persistência MySQL)

> **Data:** 2026-05-18
> **Autor (encarnado):** `mysql-database-expert` ([`.claude/agents/mysql-database-expert.md`](../../.claude/agents/mysql-database-expert.md))
> **Escopo auditado:** `src/modules/contracts/adapters/` — schema MySQL, migration, driver `mysql2`, mappers, repositórios Drizzle, adapters in-memory.
> **Motivação:** preparar o terreno antes do primeiro deploy não-CLI e antes de QA começar a exercitar fluxos. Este documento existe para que, após reinício da sessão, possamos retomar e atacar ponto a ponto.
> **Fontes citadas:**
> - Hierarquia do `CLAUDE.md` raiz (ADRs > handbook > CLAUDE.md > skills > references).
> - ADRs vinculantes: 0013, 0014, 0015, 0018, 0019, 0020.
> - Manual oficial: [`handbook/reference/mysql/mysql-refman-8.4--oracle.md`](../reference/mysql/mysql-refman-8.4--oracle.md).
> - Best practices offline (12 artigos JusDB): [`handbook/reference/mysql/best-practices/`](../reference/mysql/best-practices/README.md).
> - Driver: [`handbook/reference/mysql2/`](../reference/mysql2/).
> - ORM: [`handbook/reference/drizzle/`](../reference/drizzle/).

---

## 0. Veredito

**APROVADO com pendências:** 3 HIGH · 6 MEDIUM · 5 LOW · 2 NIT. Schema, migration e in-memory adapters estão alinhados a ADR-0020/0018. O driver e os repositórios Drizzle têm dívida operacional concreta que vale tickets curtos antes do primeiro deploy real.

---

## 1. Estado funcional do módulo Contracts (snapshot 2026-05-18)

### O que já roda hoje

| Camada | Status | Evidência |
|---|---|---|
| Domínio puro (`Contract`, `Amendment`, VOs) | ✅ Completo | `src/modules/contracts/domain/` + tickets `CTR-AGG-*`, `CTR-VO-*` |
| Use cases (6) | ✅ Completo | `create-contract`, `create-amendment`, `attach-signed-document`, `homologate-amendment`, `get-contract`, `list-contracts` |
| Ports (4) | ✅ Completo | `contract-repository`, `amendment-repository`, `event-bus`, `document-storage` |
| Adapters in-memory | ✅ Completo | `*-repository.in-memory.ts`, `event-bus.in-memory.ts` |
| Schema MySQL + migration | ✅ Completo | `persistence/schemas/mysql.ts` + `migrations/mysql/0000_*.sql` |
| Driver MySQL (`mysql2` + Drizzle) | ✅ Wirado, com pendências | `persistence/drivers/mysql-driver.ts` |
| Mappers Drizzle | ✅ Completo, com 2 violações de CLAUDE.md | `persistence/mappers/*` |
| Repositórios Drizzle | ✅ Funcionais, com N+1 | `persistence/repos/*-repository.drizzle.ts` |
| CLI PT-BR (6 comandos) | ✅ Completo | `criar-contrato`, `criar-aditivo`, `anexar-documento`, `homologar-aditivo`, `listar-contratos`, `mostrar-contrato` |
| Tests | 28 arquivos `*.test.ts` | `tests/{domain,application,adapters,cli,bdd,regression,infra}/` |

### O que NÃO existe ainda

- Camada HTTP / API REST ou GraphQL.
- Frontend / UI.
- Adapter S3 ou MinIO para `DocumentStorage` (port existe, anexar documento real depende disso).
- Outbox MySQL para eventos cross-módulo (ADR-0015) — planning pausado, ver `.claude/.planning/OUTBOX-MYSQL.md`.
- Módulo Financeiro (Fase 2).
- Autenticação / autorização / RBAC.
- Observabilidade estruturada além de `process.stderr.write` defensivo.

### Veredito de viabilidade para QA

| Tipo de QA | Pode começar? | Como |
|---|---|---|
| **QA técnico (regras de negócio)** | ✅ **Sim, hoje** | `pnpm cli:contracts -- <comando>` com `--driver memory` (state file JSON) ou `--driver mysql` (Docker compose). Exercita RN-06, RN-07, RN-12, F-L1, F-L2. |
| **QA de produto (uso diário em UI)** | ❌ Não | Precisa de HTTP API + frontend mínimo + auth. |
| **QA de integração (fluxo cross-módulo)** | ❌ Não | Faltam Financeiro, outbox e storage real. |

---

## 2. Achados por severidade

### 🔴 HIGH (resolver antes do primeiro deploy real)

#### H1 · N+1 em `ContractRepository.list()`
- **Arquivo:** `src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts:136-150`
- **Citação:** Refman §10.2 *Optimization* · best-practice [`07-buffer-pool-…`](../reference/mysql/best-practices/jusdb/07-innodb-buffer-pool-pages-chunks-eviction.md) §"Sinais de pressão" · ADR-0020 (JOIN/agregação simples permitidos).
- **Análise:** para cada `contracts.row`, abre uma query separada em `ctr_contract_homologated_amendments`. 1k contratos = 1+1000 round-trips no mesmo `connectionLimit:10` → satura pool.
- **Proposta:** trocar por **1 query** com `inArray(contract_id, ids)` e agrupar no app.
  ```ts
  const list = async () => safe('list', async () => {
    const rows = await db.select().from(schema.contracts);
    if (rows.length === 0) return [] as readonly Contract[];
    const ids = rows.map(r => r.id);
    const links = await db
      .select({
        contractId: schema.contractHomologatedAmendments.contractId,
        amendmentId: schema.contractHomologatedAmendments.amendmentId,
      })
      .from(schema.contractHomologatedAmendments)
      .where(inArray(schema.contractHomologatedAmendments.contractId, ids));
    const byContract = new Map<string, string[]>();
    for (const l of links) {
      const arr = byContract.get(l.contractId) ?? [];
      arr.push(l.amendmentId);
      byContract.set(l.contractId, arr);
    }
    const out: Contract[] = [];
    for (const row of rows) {
      const r = buildContract(row, (byContract.get(row.id) ?? []).map(amendmentId => ({ amendmentId })));
      if (!r.ok) throw new Error(r.error);
      out.push(r.value);
    }
    return out as readonly Contract[];
  });
  ```
- **Trade-off:** +1 query constante em vez de N. Memória é O(total_links), insignificante (IDs de 36 bytes).
- **Ticket sugerido:** `CTR-DB-REPO-LIST-N1`.

#### H2 · `throw new Error(...)` em `default` exaustivo dos mappers
- **Arquivos:**
  - `mappers/amendment.mapper.ts:51-54` (em `amendmentToInsert`)
  - `mappers/amendment.mapper.ts:111-114` (em `amendmentFromRow`)
  - `mappers/period.mapper.ts:21-25` (em `periodToColumns`)
  - `mappers/period.mapper.ts:37-41` (em `periodFromColumns`)
- **Citação:** `CLAUDE.md` raiz §"Anti-padrões" #7 — *"`throw new Error(...)` no `default` de switch exhaustivo — usar `const _: never = x` apenas"*.
- **Análise:** o `default` declara `const _exhaustive: never = …` (correto) **e em seguida joga `throw`**. Linha tecnicamente inalcançável, mas viola a regra do projeto e mancha o grep `throw new Error`.
- **Proposta:**
  ```ts
  default: {
    const _exhaustive: never = a;
    return _exhaustive;        // unreachable em runtime, OK para TS
  }
  ```
- **Trade-off:** zero — comportamento idêntico, conformidade com CLAUDE.md.
- **Ticket sugerido:** `CTR-DB-MAPPER-NO-THROW`.

#### H3 · Pool `mysql2` sem `idleTimeout` — ER 2006 latente
- **Arquivo:** `drivers/mysql-driver.ts:80-96`
- **Citação:** best-practice [`03-timeout-variables-…`](../reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md) §"Pool–MySQL alignment".
- **Análise:** o servidor MySQL mata conexão ociosa após `wait_timeout` (default 28800 s; recomendado 300 s). Sem `idleTimeout` no `mysql2`, o pool devolve conexão morta → ER 2006 `MySQL server has gone away`.
- **Proposta:**
  ```ts
  createPool({
    uri: opts.connectionString,
    connectionLimit: opts.poolLimit ?? DEFAULT_POOL_LIMIT,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    idleTimeout: 270_000,           // 4.5 min — 30 s abaixo de wait_timeout=300
    timezone: 'Z',                  // ver M2
  });
  ```
  Considerar expor `idleTimeoutMs` em `MysqlConnectOptions` com default `270_000`.
- **Trade-off:** conexão é renovada antes de o servidor matar.
- **Ticket sugerido:** `CTR-DB-DRIVER-POOL-TUNING` (combina com M2 e M5).

---

### 🟠 MEDIUM (ticket curto, não bloqueia QA técnico via CLI)

#### M1 · Schema sem `charset`/`collate` por tabela
- **Arquivo:** `schemas/mysql.ts:35-159`
- **Citação:** best-practice [`06-foreign-keys-…`](../reference/mysql/best-practices/jusdb/06-foreign-keys-evolution-5.7-to-8.4.md) §"Comparação por versão" · ADR-0020.
- **Análise:** Drizzle não emite charset por tabela; 8.4 rejeita FK com mismatch tipo/collation. Frágil entre Docker compose local e RDS gerenciado.
- **Proposta:** declarar `charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci'` por tabela; **`utf8mb4_bin` em colunas UUID** (`id`, `contract_id`, `signed_document_ref`, `homologated_by`, `amendment_id`).

#### M2 · Driver sem `timezone: 'Z'`
- **Arquivo:** `drivers/mysql-driver.ts:83-91`
- **Citação:** Refman §13.7.5 *Server Time Zone Support*.
- **Análise:** `mysql2` converte Date↔string usando TZ do servidor. Container em UTC e RDS em America/Sao_Paulo → drift de 3 h em datas legalmente vinculantes (`signedAt`, `homologatedAt`).
- **Proposta:** `timezone: 'Z'` no `createPool`. Opcional: `SET time_zone = '+00:00'` no smoke check.

#### M3 · Upsert sem `FOR UPDATE` no SELECT
- **Arquivos:**
  - `repos/contract-repository.drizzle.ts:66-78`
  - `repos/amendment-repository.drizzle.ts:59-67`
- **Citação:** Refman §15.7 *InnoDB Locking* · best-practice [`05-deadlock-…`](../reference/mysql/best-practices/jusdb/05-deadlock-analysis-innodb-status.md) §3.
- **Análise:** `SELECT` por PK sem `FOR UPDATE` em REPEATABLE READ. Duas transações concorrentes podem ler "não existe", ambas tentam INSERT → uma leva `ER_DUP_ENTRY` e o `safe()` traduz para `*-repo-unavailable`. Não corrompe (UNIQUE protege), mas mente o sinal de monitoramento.
- **Proposta:** usar `.for('update')` no SELECT (Drizzle expõe). Mantém o `SELECT-then-UPDATE-or-INSERT` justificado contra ODKU + UNIQUE secundária.

#### M4 · Junction populada em loop (linha-a-linha)
- **Arquivo:** `repos/contract-repository.drizzle.ts:84-88`
- **Análise:** `for (...) await tx.insert(...).values({...})` = N round-trips. Drizzle aceita `values([...])` em batch.
- **Proposta:**
  ```ts
  if (homologatedAmendmentIds.length > 0) {
    await tx.insert(schema.contractHomologatedAmendments).values(
      homologatedAmendmentIds.map(amendmentId => ({ contractId: row.id, amendmentId })),
    );
  }
  ```
- **Ticket combinado com H1:** `CTR-DB-REPO-LIST-N1` cobre N+1 + batch.

#### M5 · `applyMigrations` no boot do driver — race em prod multi-instância
- **Arquivo:** `drivers/mysql-driver.ts:116-122`
- **Citação:** best-practice [`06-foreign-keys-…`](../reference/mysql/best-practices/jusdb/06-foreign-keys-evolution-5.7-to-8.4.md) §"Migrations seguras" · Refman §13.1.20 *Atomic DDL*.
- **Análise:** Drizzle migrator usa `__drizzle_migrations` mas sem advisory lock. 3 réplicas subindo juntas em deploy → concorrência. 8.0+ tem DDL atômico, mas isso protege uma instância, não a coordenação.
- **Proposta:** em prod, `applyMigrations: false`; migrar via job dedicado (CI step ou init container). Dev/CI mantém `true`.

#### M6 · Comentário desatualizado em `money.mapper.ts`
- **Arquivo:** `mappers/money.mapper.ts:5-7`
- **Análise:** comentário cita SQLite (banido por ADR-0020). Limpar.

---

### 🟡 LOW (anotar, não bloqueia)

| # | Arquivo:linha | Item | Próximo passo |
|---|---|---|---|
| L1 | `schemas/mysql.ts:84` | índice solo em `signed_at` | composto `(status, signed_at)` quando aparecer query "ativos por data" |
| L2 | `migrations/.../0000_*.sql:57` | nome de FK `ctr_amendments_contract_id_ctr_contracts_id_fk` (44 chars) | declarar `foreignKey({ name: 'ctr_amend_contract_fk', … })` no schema |
| L3 | `schemas/mysql.ts:41,97` | `varchar(1000)` em `objective`/`description` | se crescer, migrar para `TEXT` (best-practice 04) |
| L4 | junction sem índice em `amendment_id` | PK composta cobre só `contract_id` (leftmost) | `INDEX(amendment_id)` se aparecer query reversa |
| L5 | `repos/.../contract-repository.drizzle.ts:125` (também 132, 146) | `safe()` re-lança `Error` perdendo categoria do erro | observabilidade estruturada futura |

---

### ⚪ NIT (estilo)

- `schemas/mysql.ts:77-79` — bicondicional `(A) = (B)` compacta mas opaca. Comentário já explica; manter.
- `repos/contract-repository.drizzle.ts:124` e `:132`, `repos/amendment-repository.drizzle.ts:43-45` — casts `as unknown as string` para branded ID. Convém centralizar em helper `idAsString(id)` no `domain/shared/ids.ts`.

---

## 3. Tickets sugeridos (proposta de pipeline)

Recomenda-se abrir **4 tickets W0→W3** no `.claude/.pipeline/`, em ordem:

| Ordem | Ticket | Cobre | Tamanho |
|---|---|---|---|
| 1 | `CTR-DB-MAPPER-NO-THROW` | H2 | XS — 4 linhas em 2 arquivos |
| 2 | `CTR-DB-DRIVER-POOL-TUNING` | H3 + M2 + M5 | S — driver-only |
| 3 | `CTR-DB-REPO-LIST-N1` | H1 + M4 | M — repo + suite |
| 4 | `CTR-DB-SCHEMA-HARDENING` | M1 + M3 + M6 + L2 | M — schema + migration nova |

Os LOW restantes (L1, L3, L4, L5) vão para `handbook/inquiries/` quando surgir demanda real.

---

## 4. O que está bem (registro positivo)

1. **ADR-0020 honrado integralmente:** zero JSON nativo, zero ENUM nativo, sem stored proc/trigger, sem `AUTO_INCREMENT` em PK de domínio, sem isolation level explícito.
2. **UUID em `varchar(36)`** alinhado a ADR-0018 §"Mapeamentos canônicos".
3. **Money em `bigint` de cents** + `Money.fromCents` validando ≤ `Number.MAX_SAFE_INTEGER`.
4. **Period decomposto** em 3 colunas escalares (kind + start + end nullable).
5. **CHECKs nomeados com prefix `ctr_*`** — bicondicional `endedAt ⟺ status∈{Expired,Terminated}` (F-L1) e implicação `Homologated ⟹ (homologatedAt ∧ homologatedBy ∧ signedDocumentRef)` (F-L2) corretas.
6. **`ON DELETE NO ACTION / ON UPDATE NO ACTION`** — exatamente a recomendação da best-practice 06 (`CASCADE` em prod = antipattern).
7. **Mappers retornam `Result<T, MapperError>`** — corrupção de row vira erro tipado.
8. **`safe()` wrapper na borda** — adapter converte exceção em Result; nenhum throw cruza para application.
9. **Pool com `enableKeepAlive` + `keepAliveInitialDelay`** — útil contra LB/firewalls que matam TCP ocioso (best-practice 03 §"AWS RDS").
10. **Smoke check `SELECT 1`** + `pool.end()` em falha de migrate — sem leak de pool.
11. **`SELECT-then-UPDATE-or-INSERT`** em transação, com justificativa explícita anti-ODKU (Refman §13.2.6.2). Decisão correta e bem documentada.
12. **In-memory adapters** mínimos, cobertos pela mesma suite de contrato dos Drizzle adapters — paridade real.

---

## 5. Como retomar após reinício de sessão

1. Releia este arquivo (`handbook/reviews/0002-audit-adapters-persistence-mysql.md`).
2. Releia o agente: [`.claude/agents/mysql-database-expert.md`](../../.claude/agents/mysql-database-expert.md).
3. Releia a biblioteca offline: [`handbook/reference/mysql/best-practices/README.md`](../reference/mysql/best-practices/README.md).
4. Inicie a sequência de tickets na ordem da §3 — começando por `CTR-DB-MAPPER-NO-THROW` (4 linhas, ganho de conformidade imediato).
5. Cada ticket segue o pipeline fail-first W0→W3 do `CLAUDE.md` raiz; veja a estrutura em `.claude/.pipeline/CTR-*/` existentes como modelo.

---

## 6. Apêndice — comandos de verificação rápida

```bash
# Rodar a suíte de testes
pnpm test

# Smoke da CLI com state em memória
pnpm cli:contracts -- listar-contratos

# Smoke da CLI contra MySQL local (compose precisa estar de pé)
pnpm cli:contracts -- listar-contratos --driver mysql \
  --connection-string 'mysql://core:core@127.0.0.1:3306/core'

# Typecheck + format + lint (W3 gate)
pnpm run typecheck
pnpm run format:check
pnpm run lint

# Regenerar migration (se mexer no schema MySQL)
pnpm run db:generate
```

---

**Próximo passo recomendado:** abrir `CTR-DB-MAPPER-NO-THROW` (H2) — 4 linhas, sem risco, ganha conformidade com CLAUDE.md e fica como "warm-up" para a sessão de retomada.

---

## 7. Conclusão — sequência §3 executada (2026-05-18)

Todos os 4 tickets sugeridos na §3 foram executados W0→W3 pelo protocolo `pipeline-maestro`, com 1 round de review (APPROVED) em cada. Audit trail completo em `.claude/.pipeline/CTR-DB-*/`.

| Ordem | Ticket | Cobre | Status | Audit trail |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `CTR-DB-MAPPER-NO-THROW` | H2 | ✅ concluído | [`.claude/.pipeline/CTR-DB-MAPPER-NO-THROW/`](../../.claude/.pipeline/CTR-DB-MAPPER-NO-THROW/) |
| 2 | `CTR-DB-DRIVER-POOL-TUNING` | H3 + M2 + M5 | ✅ concluído | [`.claude/.pipeline/CTR-DB-DRIVER-POOL-TUNING/`](../../.claude/.pipeline/CTR-DB-DRIVER-POOL-TUNING/) |
| 3 | `CTR-DB-REPO-LIST-N1` | H1 + M4 | ✅ concluído | [`.claude/.pipeline/CTR-DB-REPO-LIST-N1/`](../../.claude/.pipeline/CTR-DB-REPO-LIST-N1/) |
| 4 | `CTR-DB-SCHEMA-HARDENING` | M1 + M3 + M6 + L2 | ✅ concluído | [`.claude/.pipeline/CTR-DB-SCHEMA-HARDENING/`](../../.claude/.pipeline/CTR-DB-SCHEMA-HARDENING/) |

### Mudanças aplicadas (síntese)

- **Mappers** (`mappers/{amendment,period}.mapper.ts`): 4 `throw new Error(...)` em `default` exaustivo → `return _exhaustive;` (conformidade `CLAUDE.md` Anti-padrão #7).
- **Driver** (`drivers/mysql-driver.ts`): função pura `buildPoolOptions` exportada com `timezone: 'Z'` (M2), `idleTimeout: 270_000` ms + `idleTimeoutMs?: number` opcional (H3); default de `applyMigrations` invertido para `false` — prod-safe (M5).
- **Repo `contracts`** (`repos/contract-repository.drizzle.ts`): `list()` 1+N → 1+1 com `inArray` + `Map` (H1); junction insert em `values([...])` batch (M4); `.for('update')` no SELECT pré-upsert (M3).
- **Repo `amendments`** (`repos/amendment-repository.drizzle.ts`): `.for('update')` no SELECT pré-upsert (M3).
- **Schema** (`schemas/mysql.ts`): `foreignKey({ name: 'ctr_amend_contract_fk', ... })` em `amendments` (L2); comentário forte sobre charset/collate manual (responsabilidade do próximo dev).
- **Migration** (`migrations/mysql/0000_*.sql` + `meta/0000_snapshot.json`): `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em 3 CREATE TABLE; UUIDs (7 colunas) em `COLLATE utf8mb4_bin` (M1); rename `ctr_amendments_contract_id_ctr_contracts_id_fk` → `ctr_amend_contract_fk` (L2).
- **Mapper Money** (`mappers/money.mapper.ts`): comentário SQLite removido (M6).

### Decisões registradas (que se desviaram da proposta literal)

- **M1 — collation:** aplicado `utf8mb4_unicode_ci` (não `utf8mb4_0900_ai_ci` como sugerido) porque ADR-0014 fixa essa collation no server-level. ADR vence audit pela hierarquia do `CLAUDE.md`. O *defeito real* que o audit aponta — mismatch tabela ↔ default — fica eliminado, independente do sabor escolhido.
- **L2 — abordagem:** edição in-place da `0000_*.sql` (não migration nova `0001_*.sql`) porque o `_journal.json` não tem checksum e a migration nunca foi a prod. Decisão minimiza ALTER TABLE cirúrgico e deixa o schema correto desde o primeiro CREATE em CI fresh.

### Cobertura de teste resultante

| Métrica | Pré-sessão | Pós-sessão | Δ |
| :-- | :-- | :-- | :-- |
| Total | 444 | 464 | **+20** (CAs 9.x, 10.x, 11, 12, 13.x, 14, 15..23) |
| Pass | 433 | 451 | **+18** |
| Fail | 0 | 0 | 0 |
| Skipped | 11 | 13 | +2 (CA-11/12 — integration opt-in `MYSQL_INTEGRATION=1`) |

Gates W3 em todos os 4 tickets: `typecheck` ✅ · `format:check` ✅ · `test` ✅ · `lint` ✅ (bonus).

### Suítes contratuais preservadas

`runContractRepositoryContract` e `runAmendmentRepositoryContract` (em `tests/.../contract-repository.suite.ts` e `amendment-repository.suite.ts`) continuam verdes ao longo dos 4 tickets — zero regressão funcional.

### Itens deixados para `handbook/inquiries/` (conforme §3)

- **L1** índice composto `(status, signed_at)` em `ctr_contracts` — só relevante quando query "ativos por data" aparecer.
- **L3** `varchar(1000)` em `objective`/`description` — migrar para `TEXT` se o tamanho crescer.
- **L4** índice em `amendment_id` na junction — só se query reversa aparecer.
- **L5** `safe()` re-lançando `Error` perdendo categoria — observabilidade estruturada futura.
- **NITs** §201-202 — `(A) = (B)` bicondicional compacta + helper `idAsString` para casts branded → string.
- **Charset/collate via API Drizzle** (gerado por este ticket): quando `drizzle-orm` suportar table-level `charset`/`collate`, migrar a definição do SQL manual de volta para o schema TS. Hoje fica como SQL manual com comentário forte em `schemas/mysql.ts`.

### Recomendação de validação em `pnpm test:integration`

Quando o próximo CI integration rodar (`pnpm test:integration` contra MySQL real via Docker):

- **CA-11** valida `SELECT @@session.time_zone === '+00:00'` (M2).
- **CA-12** valida default `applyMigrations === false` (M5) — `SELECT FROM ctr_contracts` ⇒ `ER_NO_SUCH_TABLE` em DB resetado.
- **Suítes contratuais Drizzle/MySQL** validam o round-trip completo contra o schema endurecido (charset/collate + FK renomeada).
- Manual: `SHOW CREATE TABLE ctr_amendments` deve mostrar `CONSTRAINT ctr_amend_contract_fk` (L2) e `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` (M1).

Bloquear merge se qualquer um desses regredir.

# 12 — Runbook: ETL de Orçamento (legado → `bgp_*`)

> Procedimento para a **equipe de infra** executar a migração one-shot do Planejamento Orçamentário
> do legado (`abc-erp-financeiro-prod`) para o módulo `budget-plans` do core-api. Segue o modelo dos
> ETLs anteriores (`PARTNERS-ETL-*`, `ETL-FINANCIAL-WRITER`) — ver
> [`.claude/.pipeline/PARTNERS-ETL-BOOTSTRAP/HANDOFF.md`](../../.claude/.pipeline/PARTNERS-ETL-BOOTSTRAP/HANDOFF.md).
>
> **Script:** `scripts/etl/budget-plans/main.ts` (CLI, `--dry-run`). **Idempotente** — rodar 2× não
> duplica (idempotência por `legacy_id` + `UNIQUE`).

---

## 1. O que este ETL migra

6 entidades, na ordem de escrita (FK-segura): **plano → centro de custo → categoria → subcategoria →
orçamento (Rede) → lançamento**.

Volumes medidos no dump `Cloud_SQL_Export_2026-04-30` (podem variar num export mais novo):

| Entidade legada | → alvo | Linhas medidas |
| :-- | :-- | --: |
| `budget_plans` | `bgp_budget_plans` | 5 |
| `cost_centers` | `bgp_cost_centers` | 36 |
| `cost_centers_categories` | `bgp_categories` | 38 |
| `cost_centers_sub_categories` | `bgp_subcategories` | 390 |
| `budgets` | `bgp_budgets` | 5 |
| `budget_results` | `bgp_budget_results` | **4.679** |

Mapa completo campo a campo (regras de conversão + descartes + quarentena):
[`.claude/.pipeline/ETL-BUDGET-PLANS/000-request.md`](../../.claude/.pipeline/ETL-BUDGET-PLANS/000-request.md).

---

## 2. ⚠️ Pré-requisitos — ORDEM OBRIGATÓRIA

Este ETL **não é isolado**: ele resolve referências que precisam já existir no core.

1. **Programas migrados.** O plano resolve `programRef` pela **sigla** (`programs.abbreviation` do
   legado ↔ `prg_programs.sigla` do core). As siglas do dump devem existir em `prg_programs` — do
   contrário **todo plano cai em quarentena** (`program_ref` não resolve). Medido: `PARC`, `EPV`.
2. **Usuários migrados.** O plano resolve `updatedBy` (autoria) pelo `auth_user.legacy_id`. Usuário
   sem correspondência → `updated_by = NULL` (aceitável; não quarentena). Medido: `legacy_id` 1
   (Eduardo) e 4 (Bruno).
3. **Migrations do `budget-plans` aplicadas** no core (as tabelas `bgp_*`, incl. `legacy_id` +
   `UNIQUE` da migration `0009`). Em produção já vêm do deploy normal; o `--dry-run` também as aplica
   ao abrir o pool (DDL idempotente, sem gravar dado de negócio).

> **Programas e usuários já foram migrados** (confirmado pela P.O., 2026-07-17). Ainda assim, **execute
> o pré-check do §4** antes de rodar — não assuma; verifique.

---

## 3. ⚠️ Segurança do dump (INEGOCIÁVEL)

- O dump é **produção**, com **PII** (nomes, e-mails de autores). **Read-only absoluto.**
- **Nunca commitar** o dump nem despejar PII em log/teste.
- No ambiente de referência (abaixo) os dados vivem em **RAM** (`tmpfs`) e somem no `down -v`.
- Testes automatizados usam **fixture sintético**, jamais o dump real.

---

## 4. Ambiente de referência (fonte) + pré-check

O `compose.etl.yaml` sobe um MySQL 8.4 efêmero (RAM) para hospedar o dump como **fonte** de leitura.
Não é invocado pelo ETL — é onde a `ETL_LEGACY_CONNECTION_STRING` aponta.

```bash
# 1. Sobe o banco de referência (porta 3309, só localhost)
docker compose -f compose.etl.yaml up -d --wait

# 2. Restaura o dump (traz o próprio CREATE DATABASE `abc-erp-financeiro-prod`)
docker exec -i -e MYSQL_PWD=etl-ephemeral-local-only etl-legacy-mysql \
  mysql -uroot < "<CAMINHO_DO_DUMP>.sql"

# 3. Cria o usuário SELECT-only (o ETL lê só leitura)
docker exec -e MYSQL_PWD=etl-ephemeral-local-only etl-legacy-mysql mysql -uroot -e "
  CREATE USER IF NOT EXISTS 'etl_ro'@'%' IDENTIFIED WITH mysql_native_password BY '<SENHA_RO>';
  GRANT SELECT ON \`abc-erp-financeiro-prod\`.* TO 'etl_ro'@'%';
  FLUSH PRIVILEGES;"
```

**Pré-check dos §2.1 e §2.2 (contra o CORE de destino — não o dump):**

```sql
-- As siglas do legado existem no core? (senão: planos vão para quarentena)
SELECT sigla FROM prg_programs WHERE sigla IN ('PARC','EPV');   -- espera 2 linhas

-- Os autores têm legacy_id no core? (senão: updated_by = NULL)
SELECT legacy_id FROM auth_user WHERE legacy_id IN (1,4);        -- espera 2 linhas
```

Divergência aqui → **pare** e resolva o pré-requisito antes de rodar. As siglas do dump conferem-se
com: `SELECT abbreviation FROM programs;` no banco de referência.

---

## 5. Variáveis de ambiente

| Env | Aponta para | Exemplo |
| :-- | :-- | :-- |
| `ETL_LEGACY_CONNECTION_STRING` | o **dump** (banco de referência ou réplica) | `mysql://etl_ro:<SENHA_RO>@127.0.0.1:3309/abc-erp-financeiro-prod` |
| `ETL_CORE_CONNECTION_STRING` | o **core de destino** (onde grava `bgp_*`) | `mysql://<user>:<pw>@<host>:3306/core` |

Ausência de `ETL_LEGACY_CONNECTION_STRING` → o script falha explícito
(`etl-legacy-connection-string-missing`), nunca com default de lab.

---

## 6. Dry-run (SEMPRE primeiro)

O `--dry-run` **lê** o legado, resolve refs, aplica o mapper e **reconcilia**, mas **não grava** dado
de negócio (só aplica as migrations DDL ao abrir o pool).

```bash
export ETL_LEGACY_CONNECTION_STRING='mysql://etl_ro:<SENHA_RO>@127.0.0.1:3309/abc-erp-financeiro-prod'
export ETL_CORE_CONNECTION_STRING='mysql://<user>:<pw>@<host>:3306/core'

node --experimental-strip-types --enable-source-maps --no-warnings \
  scripts/etl/budget-plans/main.ts --dry-run
```

**Relatório esperado** (`read = migrated + quarantined + alreadyExists` por entidade):

```
plans:         read=5    migrated=5    quarantined=0  alreadyExists=0
costCenters:   read=36   migrated=36   quarantined=0  alreadyExists=0
categories:    read=38   migrated=38   quarantined=0  alreadyExists=0
subcategories: read=390  migrated=390  quarantined=0  alreadyExists=0
budgets:       read=5    migrated=5    quarantined=0  alreadyExists=0
budgetResults: read=4679 migrated=4679 quarantined=0  alreadyExists=0
  model: IPCA=4367 DESPESAS_PESSOAIS=276 DESPESAS_LOGISTICAS=36
  diff soma por Rede vs legado: 0 cents
```

**Critérios de aceite do dry-run (não rode pra valer se algum falhar):**

- Contagens `read` batem com o §1 (ou com o export corrente).
- **`quarantined = 0`** em todas as entidades. Se > 0, ver §8 antes de prosseguir.
- `model`: IPCA + PESSOAIS + LOGÍSTICAS = total de lançamentos.
- **`diff soma por Rede vs legado = 0 cents`** (a soma dos lançamentos migrados reproduz o
  `budgets.valueInCents` do legado).

---

## 7. Execução real

Só depois do dry-run limpo. **Antes:** snapshot/backup do core de destino.

```bash
node --experimental-strip-types --enable-source-maps --no-warnings \
  scripts/etl/budget-plans/main.ts
```

Mesmo relatório, agora com escrita. **Idempotente:** se a migração for interrompida e re-executada,
as linhas já gravadas voltam como `alreadyExists` (não duplica — garantido pelo `UNIQUE(legacy_id)`).

---

## 8. Quarentena

Linhas que violam uma regra vão para quarentena (**nunca** são descartadas em silêncio). Motivos
possíveis (todos no mapa):

| Motivo | Causa |
| :-- | :-- |
| `program_ref` não resolve | sigla do plano ausente em `prg_programs` (pré-req §2.1) |
| `partner_uf` divergente | UF do município ≠ UF do estado no orçamento |
| `version` precisão | `version` do plano com > 1 casa decimal |
| `sub_category_type` = `INSTITUCIONAL` | o alvo só guarda `REDE` |
| `model` não resolve | subcategoria sem `releaseType` |

Saída: resumo **PII-free** versionável + detalhe (com dado) em `.tmp/etl-budget-plans/` (gitignored).
Toda quarentena deve ser justificada linha a linha antes de considerar a migração completa.

---

## 9. Verificação pós-migração (no core de destino)

```sql
SELECT
  (SELECT COUNT(*) FROM bgp_budget_plans)   AS plans,       -- 5
  (SELECT COUNT(*) FROM bgp_cost_centers)   AS cost_centers,-- 36
  (SELECT COUNT(*) FROM bgp_categories)     AS categories,  -- 38
  (SELECT COUNT(*) FROM bgp_subcategories)  AS subcategories,-- 390
  (SELECT COUNT(*) FROM bgp_budgets)        AS budgets,     -- 5
  (SELECT COUNT(*) FROM bgp_budget_results) AS results;     -- 4679

-- Total anual por plano = soma dos 12 meses (prova de integridade do grão mês a mês)
SELECT budget_id, SUM(value_cents) FROM bgp_budget_results GROUP BY budget_id;
```

Confronte com o banco de referência (`SELECT COUNT(*) FROM budget_results;` etc.).

---

## 10. Reversão

O ETL é aditivo e idempotente. Para desfazer uma migração de teste, `TRUNCATE` as `bgp_*` na ordem
inversa das FKs (results → subcategories → categories → cost_centers → budgets → budget_plans) ou
restaure o snapshot pré-migração. Sem migration a reverter (a coluna `legacy_id` é permanente e
inócua). Ao terminar o ambiente de referência: `docker compose -f compose.etl.yaml down -v` (apaga o
dump da RAM).

---

## 11. Validação automatizada (CI / dev)

- **Gate estático** (`typecheck`/`format`/`lint`/`test`): roda no CI a cada push. O mapper puro (17
  regras + 4 quarentenas) é coberto por unit tests sem DB.
- **Integração ponta-a-ponta** (`tests/etl/budget-plans/writer.integration.test.ts`, opt-in
  `PARTNERS_ETL_INTEGRATION=1` + `ETL_LEGACY_CONNECTION_STRING`): afere as contagens 5/5/4679, a soma
  por Rede (diff 0) e a idempotência **contra o banco de referência** — exige o dump e os
  pré-requisitos migrados, então roda **neste ambiente controlado**, não no CI padrão (o CI não tem o
  dump de produção). É a versão automatizada deste runbook.

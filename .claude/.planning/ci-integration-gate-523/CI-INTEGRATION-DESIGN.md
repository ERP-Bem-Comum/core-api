# CI-INTEGRATION-DESIGN — fechar o buraco de CI da #523

> Investigação **read-only**. Nenhum arquivo de workflow/código foi tocado. O
> entregável é este documento: recomendação + DRAFT do `.github/workflows/integration.yml`
> (em bloco de código, para revisão humana antes de commitar).
>
> Escopo: as suítes **MySQL/MinIO** de integração não rodam em nenhum workflow
> (`.github/workflows/ci.yml:7-9` declara o recorte offline). O único job de
> integração hoje é `integration-notifications.yml` (só `notifications`/Mailpit).
> Isso deixou 4 defeitos latentes na `dev` — um deles bug de **produção** (#519).

---

## 0. Recomendação principal (TL;DR)

Criar **um** workflow novo, `.github/workflows/integration.yml`, que roda o runner já
existente (`scripts/ci/test-integration.ts`) uma vez **por suíte**, numa **matrix**
do GitHub Actions (`fail-fast: false`), disparando em **todo PR para `dev`/`main`**
(+ `schedule` nightly + `workflow_dispatch`). Cada job da matrix é uma VM
`ubuntu-latest` isolada que sobe **seu próprio** MySQL/MinIO efêmero via o
`docker compose up` **do runner** (não via `services:` nativo). Rollout em duas
fases: entra **report-only** (`continue-on-error`), e vira **required** (via um job
agregador "gate") só depois que #519/#520/#521/#522 fecharem.

As **3 decisões mais importantes**:

1. **Matrix por suíte, não job sequencial único.** O runner já é per-suíte
   (`scripts/ci/test-integration.ts:284-305`: um `up`/`down` por invocação); a
   matrix apenas espelha isso. Ganha paralelismo, um check verde/vermelho **por
   suíte** (feedback legível) e — como cada job da matrix é uma VM separada — some
   o conflito de porta 3306/9000 que um job único teria de gerenciar.

2. **Manter o `docker compose up` do runner; NÃO migrar para `services:`.** O
   `services:` do Actions sobe o container **antes** do checkout, então não
   consegue montar `docker/mysql/conf.d/server.cnf` nem `docker/mysql/initdb.d/*`
   (`compose.yaml:186-189`). Essa config (`sql_mode=STRICT_ALL_TABLES`, timezone
   tables) é **exatamente** o que faz o #519 (errno 1406) e o #522 reproduzirem.
   Perder a paridade de config derrotaria o propósito do workflow.

3. **Report-only primeiro, required depois.** Ligar como blocking **hoje** deixaria
   a `dev` vermelha até os 4 defeitos fecharem (5 jobs da matrix nascem vermelhos:
   `financial`, `budget-plans`, `partners`, `etl`, `etl:orchestrate`). Entra com
   `continue-on-error: true`, dá visibilidade e reprodução em CI já, e vira gate
   obrigatório quando o verde for real.

---

## 1. Contexto verificado (arquivos reais)

| Fato                                                                                                                                   | Fonte                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ci.yml` roda só `pnpm test` (unit, offline); integração fica atrás de opt-in                                                          | `.github/workflows/ci.yml:7-9`, `:45-46`                                  |
| `ci.yml` dispara em PR para `dev`/`main` + `workflow_dispatch`; `concurrency` cancela redundantes                                      | `.github/workflows/ci.yml:11-14`, `:16-18`                                |
| Único job de integração hoje: `notifications` (Mailpit), via path-filter                                                               | `.github/workflows/integration-notifications.yml:12-20`, `:40-41`         |
| Runner é **per-suíte**: `writeSecrets → compose up --wait → node --test → finally down -v + removeSecrets`                             | `scripts/ci/test-integration.ts:284-305`                                  |
| `dockerUp` = `docker compose up -d <services> --wait` (SEM `compose.ci.yaml`, portas expostas)                                         | `scripts/ci/test-integration.ts:260-262`                                  |
| `dockerDown` = `docker compose down -v` (apaga volumes) no `finally` — inofensivo em CI, destrutivo em dev (#500)                      | `scripts/ci/test-integration.ts:264-266`, `:301-304`                      |
| Manifesto declara 16 suítes com `services`, `secrets`, `env` (gate), `concurrency1`, `paths`                                           | `scripts/ci/test-integration.ts:50-244`                                   |
| Runner só cria os **3 secrets de MySQL** (`writeTestSecrets`); MinIO **não** é coberto                                                 | `scripts/ci/test-integration.ts:26-30`, `:246-252`                        |
| `secrets:setup` gera **todos** os `./secrets/*.txt`, inclusive `minio_root_user`/`minio_root_password`                                 | `scripts/setup/secrets.ts:51-84`, `package.json:46`                       |
| Compose: MySQL 8.4 pin por digest + conf.d/initdb.d montados + healthcheck TCP real                                                    | `compose.yaml:176`, `:186-211`                                            |
| Compose: MinIO pin por digest + healthcheck `/minio/health/ready`; bucket vem do `minio-bootstrap` (depends_on minio, **sem profile**) | `compose.yaml:98`, `:120-125`, `:133-157`                                 |
| `compose.ci.yaml`: override que faz `ports: !reset null` (usado só pela suíte `infra`, via `docker exec`)                              | `compose.ci.yaml:16-20`                                                   |
| Actions pinadas por SHA (ADR-0011); Node 24 via `setup-node`; pnpm via `corepack enable`                                               | `.github/workflows/ci.yml:29-38`, `.github/workflows/deploy-qa.yml:40-71` |
| Repo é **público** → Actions em runner padrão é **grátis** (sem cobrança de minutos)                                                   | memory `repos-core-api-erp-infra-are-public`                              |

### 1.1 Inventário das suítes (o que entra no CI)

Do manifesto (`scripts/ci/test-integration.ts:50-244`), classificado por serviço:

| Suíte              | `services` | `concurrency1` | Nº de paths | Gate env                      | Entra no workflow?                                                                                                                                                                                                                     |
| ------------------ | ---------- | -------------- | ----------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contracts`        | mysql      | sim            | 12          | `MYSQL_INTEGRATION=1`         | **sim**                                                                                                                                                                                                                                |
| `auth`             | mysql      | sim            | 7           | `MYSQL_INTEGRATION=1`         | **sim**                                                                                                                                                                                                                                |
| `partners`         | mysql      | sim            | 13          | `MYSQL_INTEGRATION=1`         | **sim** (⚠️ #521)                                                                                                                                                                                                                      |
| `programs`         | mysql      | sim            | 2           | `MYSQL_INTEGRATION=1`         | **sim**                                                                                                                                                                                                                                |
| `budget-plans`     | mysql      | sim            | 10          | `MYSQL_INTEGRATION=1`         | **sim** (⚠️ #520)                                                                                                                                                                                                                      |
| `financial`        | mysql      | sim            | ~28         | `MYSQL_INTEGRATION=1`         | **sim** (⚠️ #519 — o pesado)                                                                                                                                                                                                           |
| `etl`              | mysql      | sim            | 2           | `PARTNERS_ETL_INTEGRATION=1`  | **sim** (⚠️ #522)                                                                                                                                                                                                                      |
| `etl:orchestrate`  | mysql      | sim            | 1           | idem                          | **sim** (⚠️ #522)                                                                                                                                                                                                                      |
| `etl:contracts`    | mysql      | sim            | 1           | idem                          | **sim**                                                                                                                                                                                                                                |
| `etl:financial`    | mysql      | sim            | 1           | idem                          | **sim**                                                                                                                                                                                                                                |
| `etl:budget-plans` | mysql      | sim            | 1           | idem                          | **NÃO** — depende de dump legado ausente do repo (#522 "fora de escopo"; sem script em `package.json`)                                                                                                                                 |
| `storage`          | minio      | não            | 1           | `STORAGE_INTEGRATION=1`       | **sim** (precisa `secrets:setup`)                                                                                                                                                                                                      |
| `photo`            | minio      | não            | 1           | `STORAGE_INTEGRATION=1`       | **sim** (precisa `secrets:setup`)                                                                                                                                                                                                      |
| `logo`             | minio      | não            | 1           | `STORAGE_INTEGRATION=1`       | **sim** (precisa `secrets:setup`)                                                                                                                                                                                                      |
| `notifications`    | mailpit    | não            | glob        | `NOTIFICATIONS_INTEGRATION=1` | **NÃO** — já coberta por `integration-notifications.yml`                                                                                                                                                                               |
| `infra`            | (nenhum)   | sim            | 1           | `COMPOSE_INTEGRATION=1`       | **opcional** — meta-teste do compose; sobe container **por conta própria** com `compose.ci.yaml` + `docker exec` (`tests/infra/mysql-compose.test.ts:1-40`). Precisa só de `docker` no PATH; pode entrar como job avulso (não-matrix). |

Total no novo workflow: **13 suítes** (10 mysql + 3 minio), + `infra` opcional. `etl:budget-plans` e `notifications` ficam de fora, por motivos distintos.

---

## 2. Q1 — Estratégia de job: matrix vs. job sequencial único

**Recomendação: `matrix` (uma job por suíte), com `fail-fast: false`.**

| Critério                    | Matrix (1 job/suíte)                                                                               | Job sequencial único                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Aderência ao runner         | Alta — o runner já é per-suíte (`:284-305`), a matrix só o invoca N vezes                          | Média — teria loop `for suite in ...` no job                                                          |
| Feedback                    | 1 check verde/vermelho **por suíte** — aponta a suíte quebrada direto (critério de aceite da #523) | 1 check só; qual suíte quebrou vira leitura de log                                                    |
| Paralelismo / wall-clock    | ~4-5 min (jobs em paralelo, até 20 concorrentes)                                                   | Soma de todas: ~20-30 min sequencial                                                                  |
| Conflito de porta 3306/9000 | **Nenhum** — cada job é VM isolada; o runner expõe portas sem colidir                              | Real — as suítes rodam na MESMA VM; um `down -v` entre elas serializa, e um resíduo derruba a próxima |
| Isolamento de falha         | Total (`fail-fast: false`) — uma suíte vermelha não some as outras                                 | Frágil — `set -e` no primeiro erro aborta o resto; some visibilidade                                  |
| Custo de spin-up            | N× checkout/install (mitigável com cache de store pnpm)                                            | 1×                                                                                                    |

O único ponto a favor do job único é economizar N spin-ups de VM/install. Como o
repo é **público** (Actions grátis) e o `setup-node` cacheia o store do pnpm, o
custo extra da matrix é wall-clock desprezível e billing zero. O ganho de
legibilidade + isolamento paga com folga. **Matrix.**

---

## 3. Q2 — `services:` do Actions vs. `docker compose up` do runner

**Recomendação: manter o `docker compose up` do runner. NÃO migrar para `services:`.**

Este é o ponto técnico mais decisivo do design. Três razões, em ordem de peso:

1. **`services:` sobe o container antes do checkout → sem paridade de config.**
   Serviços declarados em `jobs.<id>.services` sobem **antes** de qualquer `step`,
   inclusive o `actions/checkout`. Logo não há como montar
   `docker/mysql/conf.d/server.cnf` nem `docker/mysql/initdb.d/*`
   (`compose.yaml:186-189`) — os arquivos ainda não existem no runner. Sem eles,
   perde-se `sql_mode=STRICT_ALL_TABLES` e as timezone tables. É **precisamente**
   essa config que faz o **#519** disparar `errno 1406 / SQLSTATE 22001`
   (`Data too long`) e o **#522** ser reprodutível. Um MySQL "cru" via `services:`
   mascararia o bug de produção que motiva a issue. A #523 (e o #519, #522)
   sublinham que a paridade `conf.d`+`initdb.d` é **load-bearing**.

2. **Fidelidade dev↔CI e digest pin (ADR-0011).** O `compose.yaml` já pina MySQL
   e MinIO por digest (`compose.yaml:176`, `:98`) e define healthchecks calibrados
   (`:194-211`, `:120-125`) — o TCP real do MySQL (`:201-207`) evita o falso
   positivo do `mysqladmin ping` durante os init scripts. Reproduzir isso em
   `services:` exigiria duplicar imagem, healthcheck e opções à mão — a "fábrica de
   drift" da memory `duplicated-rule-is-the-drift-factory`. O runner já resolve
   tudo com `--wait`.

3. **Os testes conectam em `127.0.0.1:3306` (porta do host).** O runner sobe o
   compose **sem** o `compose.ci.yaml`, então as portas ficam expostas
   (`scripts/ci/test-integration.ts:260-262`) — exatamente o que o `mysql2`
   rodando no runner precisa. Em VM isolada da matrix, expor porta é inofensivo.

**Trade-off aceito:** `docker compose up --wait` custa ~35-50s de startup (init do
MySQL 8.4 + carga de ~1795 linhas de timezone via `initdb.d`), mais lento que um
`services:` com healthcheck simples. Paga-se esse tempo em troca de fidelidade —
e é o startup que garante que o CI enxerga o bug real.

---

## 4. Q3 — Gatilho: todo PR, path-filter, ou nightly?

**Recomendação: `pull_request` para `dev`/`main` (matrix completa) + `schedule`
nightly + `workflow_dispatch`.**

Racional: a lição central da #523 é que **cobertura seletiva/manual = bug
perdido**. O #519 é bug de **produção** que o unit não pegou e que a suíte
(escrita e existente) só nunca rodou. Path-filter por módulo é uma forma de
seletividade que pode **furar** em mudanças transversais: um VO em `src/shared/**`,
uma fixture (`tests/etl/fixtures/legacy-mini.sql` — causa do #522), uma migration
helper, ou o próprio `scripts/ci/test-integration.ts`. Rodar tudo em todo PR é a
opção que honra o "nenhuma suíte é silenciosamente pulada" (critério de aceite).

**Custo (estimativa grosseira):**

- Por job: checkout ~5s + `setup-node`+cache ~15-30s + `corepack` ~2s +
  `pnpm install --frozen-lockfile` ~20-40s (store cacheado) + `secrets:setup` ~2s +
  `compose up --wait` (~40s mysql / ~12s minio) + `node --test` (suítes pequenas
  ~15-40s; `financial` ~28 arquivos em `--test-concurrency=1` ~90-150s) + `down` ~5s.
- **Por suíte: ~2-3,5 min** (financial ~4 min).
- **Por PR: ~13 jobs ≈ ~40 min-equivalente somados**, **wall-clock ~4-5 min** com os
  jobs em paralelo (GitHub concede até 20 jobs concorrentes).
- **Billing: R$ 0.** Repo público → runner padrão é grátis (memory
  `repos-core-api-erp-infra-are-public`). O objeção-custo praticamente evapora; o
  constraint real é **concorrência de runner / fila**, não fatura.
- Nightly adiciona 1 execução completa/dia (~40 min-equivalente), grátis, e pega
  drift de fixture/dep sem depender de PR — mesmo padrão do `audit.yml:24-26`.

**Variante de contenção (se a fila de runner incomodar), não recomendada como
padrão:** path-filter por módulo — cada suíte gated pelos paths do seu módulo +
paths compartilhados (`src/shared/**`, `scripts/ci/test-integration.ts`,
`compose.yaml`, `docker/mysql/**`, `tests/etl/fixtures/**`) — **somado a** um
nightly da matrix completa como rede de segurança. Mantém o custo por-PR menor sem
abrir mão da detecção diária de drift. O risco é a manutenção do mapa de paths
(quando furar, some cobertura em silêncio — o anti-padrão que a #523 combate).

---

## 5. Q4 — Blocking vs. report-only: sequência de rollout

**Recomendação: entra report-only, vira required em 3 passos.**

Hoje, ligar como blocking deixaria a `dev` vermelha até 4 issues fecharem. Jobs da
matrix que **nascem vermelhos**: `financial` (#519 — bug de prod + schema),
`budget-plans` (#520), `partners` (#521), `etl` e `etl:orchestrate` (#522). Os
demais (`contracts`, `auth`, `programs`, `etl:contracts`, `etl:financial`,
`storage`, `photo`, `logo`) devem nascer verdes.

### Fase 0 — Aterrissar report-only (agora)

- Merge do `integration.yml` com **`continue-on-error: true`** no job da matrix.
- O workflow roda em todo PR, mostra os 5 vermelhos, mas **não bloqueia merge**.
- Ganho imediato: reprodução determinística em CI dos 4 defeitos + baseline de
  quais suítes já estão verdes. Nenhuma proteção de branch alterada ainda.

### Fase 1 — Fechar os defeitos (em paralelo, cada um no seu ticket W0→W3)

- #519 (p1, prod): `varchar(16)` → comportar `'PartiallyReconciled'` (19) em
  `fin_payables.status` **e** `fin_documents.status` (mesma largura, mesmo CHECK).
- #520 (p2): asserir `cause.errno === 1062` em vez de regex `/duplicate/i`.
- #521 (p2): isolar o CNPJ do `suppliers-batch-reader` (colisão de ordem de suíte).
- #522 (p2): asserção `2 → 3` (fixture ganhou 3º collaborator) + corrigir o
  diagnóstico "falso-negativo de ambiente".
- A cada suíte que fica verde, **nada muda no workflow** — o report-only já roda.

### Fase 2 — Tornar required (quando a matrix estiver verde)

- Remover `continue-on-error`.
- Adicionar um **job agregador `gate`** (`needs: [integration]`) que falha se
  qualquer job da matrix falhou/foi cancelado — porque nomes de job de matrix são
  dinâmicos e o branch protection não sabe casá-los individualmente. **O check
  required é o `gate`**, não os jobs da matrix. Padrão canônico para required
  matrix.
- Marcar `gate` como **required status check** no branch protection de `dev` e
  `main` (op de repo, fora do arquivo).

**Gotcha de gate (crítico — critério de aceite da #523 e do #521):** o #521 sai com
`exit 1` mas `cancelled 1 / fail 0` no sumário do `node:test`. **Não** parsear o
texto do sumário; confiar **só no exit code** — o GitHub já marca o step vermelho
quando o comando sai != 0, e o runner propaga o status (`spawnSync(...).status ?? 1`
em `scripts/ci/test-integration.ts:277-281`, `process.exitCode = main()` em `:307`).
**Nunca** adicionar `|| true`, `continue-on-error` na Fase 2, nem ler "fail 0" como
verde. O job agregador `gate` fecha o furo do "cancelled lido como verde".

---

## 6. Q5 — Matriz de serviços por suíte

O manifesto já declara os serviços por suíte (`scripts/ci/test-integration.ts`);
o workflow só precisa refletir uma diferença operacional: **quem cria os secrets**.

| Suíte                                                                                    | Serviço que sobe                                                                      | Secrets necessários                      | Quem os cria                                                                   |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| mysql (`contracts`, `auth`, `partners`, `programs`, `budget-plans`, `financial`, `etl*`) | `mysql`                                                                               | `mysql_root/app/readonly_password`       | **o runner** (`writeTestSecrets`, `:246-252`) — self-sufficient                |
| minio (`storage`, `photo`, `logo`)                                                       | `minio`                                                                               | `minio_root_user`, `minio_root_password` | **`pnpm run secrets:setup`** — o runner NÃO cria (`secrets:false`, `:185-205`) |
| `infra` (opcional)                                                                       | nenhum via runner; a suíte sobe `mysql` sozinha com `compose.ci.yaml` + `docker exec` | os 3 mysql (a própria suíte gera)        | a suíte                                                                        |

**Gotcha MinIO (verificar na 1ª execução):** as 3 suítes MinIO têm `secrets:false`,
então o runner não escreve `secrets/minio_root_user.txt` / `minio_root_password.txt`.
Num checkout limpo de CI esses arquivos não existem, e `docker compose up minio`
falha ao resolver o secret (`compose.yaml:112-117`, `:609-612`). **Correção:** rodar
`pnpm run secrets:setup` no job **antes** do runner. É idempotente (pula existentes),
gera todos os `./secrets/*.txt` (`scripts/setup/secrets.ts:51-84`), e para as suítes
MySQL o runner sobrescreve os 3 arquivos de senha com seus valores fixos de teste —
sem conflito (os `*_database_url.txt` gerados pelo setup não são consumidos pelo
bare `up` do serviço mysql/minio). Por simplicidade e robustez, o DRAFT roda
`secrets:setup` em **todos** os jobs.

**Nota sobre o bucket MinIO:** o runner sobe só `minio` (nomeado); o
`minio-bootstrap` (`compose.yaml:133-157`) tem `depends_on: minio` mas **não** é
nomeado nem tem profile, então `docker compose up minio` **não** o dispara — o
bucket `contracts-documents` pode não ser criado. As suítes `storage/photo/logo`
hoje passam localmente (não estão entre os 4 defeitos), então presumivelmente
auto-provisionam o bucket. Se algum job MinIO falhar por bucket ausente, a correção
é nomear `minio-bootstrap` no `up` (fora do escopo desta issue — anotar como
follow-up, não consertar aqui: anti-padrão de scope-creep).

---

## 7. Q6 — Concorrência e custo

- **`concurrency` com `cancel-in-progress: true`**, agrupado por ref — espelha
  `ci.yml:16-18` e `audit.yml:29-31`. Um novo push no PR cancela o run anterior;
  economiza runner e fila.
- **`fail-fast: false`** na matrix — **obrigatório**. Sem ele, a primeira suíte
  vermelha (hoje: 5 delas) abortaria as irmãs e **sumiria a visibilidade** — o
  oposto do que a #523 pede ("o relatório diz o que rodou"). Com report-only na
  Fase 0, todas as 13 rodam e reportam.
- **`max-parallel`**: deixar o default (GitHub roda até o limite da conta, ~20
  concorrentes). Não limitar — wall-clock é o recurso, e é grátis no repo público.
- **Cache do store pnpm** via `actions/setup-node` (`cache: 'pnpm'`) — corta o
  `pnpm install` de ~40s para ~15-20s em cache quente, em cada job da matrix.

---

## 8. DRAFT — `.github/workflows/integration.yml`

> ⚠️ **NÃO commitado.** Rascunho para revisão. Os SHAs são **placeholders** — pinar
> por digest antes de mergear (ADR-0011), conferindo o SHA de cada tag na release
> oficial da action. Os SHAs de `checkout` e `setup-node` abaixo são os **já em uso**
> em `ci.yml:30`, `:32` (reaproveitar). `docker compose` já vem no `ubuntu-latest`.

```yaml
name: integration

# Suítes MySQL/MinIO de integração — fecha o buraco da #523. O ci.yml segue
# offline (só unit); ESTE workflow sobe MySQL/MinIO efêmeros (via o runner
# scripts/ci/test-integration.ts) e roda as suítes reais que pegam bugs de
# schema/persistência — incluindo o #519 (bug de PRODUÇÃO: errno 1406).
#
# Uma job por suíte (matrix, fail-fast:false) — o runner já é per-suíte. Cada job
# é uma VM isolada que sobe seu compose próprio (docker/mysql/conf.d + initdb.d
# montados = paridade de config; é o que faz o #519/#522 reproduzirem — services:
# nativo NÃO dá essa paridade porque sobe antes do checkout).
#
# Actions pinadas por SHA (ADR-0011). Repo público → Actions grátis.

on:
  pull_request:
    branches: [dev, main]
  schedule:
    # Nightly 05:00 UTC (02:00 BRT) — pega drift de fixture/dep sem depender de PR
    # (mesmo padrão do audit.yml). Ex.: o #522 foi drift de fixture desde 2026-07-02.
    - cron: "0 5 * * *"
  workflow_dispatch: {}

concurrency:
  group: integration-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  integration:
    name: integração (${{ matrix.suite }})
    runs-on: ubuntu-latest
    # FASE 0 (rollout): report-only até #519/#520/#521/#522 fecharem. Remover na
    # Fase 2 e tornar o job `gate` (abaixo) o required status check.
    continue-on-error: true
    strategy:
      fail-fast: false # uma suíte vermelha NÃO pode sumir as outras (#523).
      matrix:
        suite:
          # MySQL (o runner cria os 3 secrets de MySQL sozinho):
          - contracts
          - auth
          - partners # ⚠️ #521 (vermelho até fechar)
          - programs
          - budget-plans # ⚠️ #520
          - financial # ⚠️ #519 (bug de prod) — a suíte mais pesada (~28 arquivos)
          - etl # ⚠️ #522
          - etl:orchestrate # ⚠️ #522
          - etl:contracts
          - etl:financial
          # MinIO (precisam do secrets:setup — o runner NÃO cria os secrets do MinIO):
          - storage
          - photo
          - logo
          # etl:budget-plans FICA DE FORA: depende de dump legado ausente do repo (#522).
          # notifications FICA DE FORA: já coberta por integration-notifications.yml.
    steps:
      - name: Checkout
        # SHA já em uso em ci.yml:30 (v6.0.3). Pinar por digest (ADR-0011).
        uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3

      - name: Node 24 (runtime do --experimental-strip-types) + cache do store pnpm
        # SHA já em uso em ci.yml:32 (v6.4.0). `cache: pnpm` corta o install em cache quente.
        uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: "24"
          cache: pnpm

      - name: Habilita pnpm (corepack lê a versão do packageManager)
        run: corepack enable

      - name: Install (frozen-lockfile)
        run: pnpm install --frozen-lockfile

      - name: Gera secrets de teste (necessário p/ suítes MinIO; o runner sobrescreve os do MySQL)
        # storage/photo/logo têm secrets:false no manifesto → o runner NÃO cria
        # minio_root_user/password. Sem estes arquivos, `compose up minio` falha ao
        # resolver o secret (compose.yaml:112-117). Idempotente e barato; roda em todas.
        run: pnpm run secrets:setup

      - name: Integração (${{ matrix.suite }}) — sobe compose efêmero + roda a suíte
        # O runner: compose up --wait (config-parity: conf.d + initdb.d) → node --test
        # → finally: down -v. O `down -v` é INOFENSIVO aqui (VM efêmera), destrutivo
        # só em dev (#500). Exit code != 0 = vermelho, MESMO com "fail 0/cancelled 1"
        # no sumário do node:test (o caso do #521). NÃO adicionar `|| true`.
        run: node --experimental-strip-types --enable-source-maps --no-warnings scripts/ci/test-integration.ts "${{ matrix.suite }}"

      - name: Diagnóstico do compose em caso de falha
        if: failure()
        run: docker compose ps -a && docker compose logs --tail=100 || true

  # FASE 2 — agregador que vira o único required status check. Ativar (marcar como
  # required no branch protection de dev/main) só quando a matrix estiver verde.
  # Necessário porque nomes de job de matrix são dinâmicos e o branch protection
  # não casa cada um; este `gate` colapsa o resultado num check estável.
  gate:
    name: integração (gate)
    if: always()
    needs: [integration]
    runs-on: ubuntu-latest
    steps:
      - name: Falha se qualquer suíte falhou ou foi cancelada
        # result ∈ success|failure|cancelled|skipped. Só `success` passa.
        # Com `continue-on-error:true` na Fase 0, `needs.integration.result` é
        # `success` mesmo com jobs vermelhos (o erro fica "engolido"); por isso o
        # gate só é significativo na Fase 2, DEPOIS de remover o continue-on-error.
        run: |
          result="${{ needs.integration.result }}"
          echo "integration matrix result: $result"
          test "$result" = "success"
```

> **Nota sobre `continue-on-error` × `gate` (Fase 0 → Fase 2):** enquanto o job da
> matrix tiver `continue-on-error: true`, o `needs.integration.result` agrega como
> `success` mesmo com jobs internos vermelhos — então o `gate` passa e **não**
> bloqueia (comportamento desejado na Fase 0). Ao remover o `continue-on-error` na
> Fase 2, um job vermelho torna `needs.integration.result = failure` e o `gate`
> falha — aí, e só aí, marcar `gate` como required. Ou seja: **um único arquivo**,
> a virada blocking é remover uma linha + marcar o check no branch protection.

---

## 9. Sequência de rollout (resumo acionável)

1. **Fase 0 — merge report-only.** `integration.yml` com `continue-on-error: true`.
   Roda em todo PR; mostra 5 vermelhos; não bloqueia. Verificar na 1ª execução: (a)
   suítes MinIO sobem com `secrets:setup`; (b) `financial` cabe no tempo de job (~4
   min); (c) suítes verdes esperadas realmente verdes.
2. **Fase 1 — fechar #519 (p1, prod) → #520 → #521 → #522**, cada uma no seu ticket
   W0→W3. Nada muda no workflow; o report-only vai ficando verde suíte a suíte.
3. **Fase 2 — tornar required.** Remover `continue-on-error`; marcar o check
   `integração (gate)` como required no branch protection de `dev` e `main`.
4. **Follow-ups (issues separadas, NÃO neste PR):** `etl:budget-plans` (dump legado
   — #522 fora de escopo), cobrir `tests/jobs/**/*.integration` (#360), bucket do
   `minio-bootstrap` se algum job MinIO falhar, e a #500 (o `down -v` destrutivo em
   dev — não bloqueia o CI, mas é o motivo de ninguém rodar local).

---

## 10. Trade-offs consolidados (uma linha cada)

- **Matrix vs. job único:** matrix ganha em feedback por-suíte e isolamento de
  falha; perde em N spin-ups — irrelevante num repo público com cache de store.
- **`compose up` vs. `services:`:** `compose up` dá paridade de config (conf.d +
  initdb.d) que é o que faz o #519/#522 reproduzirem; `services:` sobe antes do
  checkout e não monta a config → mascararia o bug. Custo: ~40s de startup/job.
- **Todo PR vs. path-filter:** todo PR honra "nada é pulado em silêncio" (#523);
  path-filter é mais barato mas fura em mudanças transversais (shared/fixture). Como
  o billing é zero (repo público), todo-PR vence; path-filter+nightly fica como
  plano B se a fila de runner apertar.
- **Report-only → required:** entra sem travar a `dev` (4 defeitos abertos), vira
  gate obrigatório via job agregador quando o verde for real — virada = 1 linha.
- **Confiar no exit code, nunca no sumário:** o #521 (`cancelled 1 / fail 0`, exit 1)
  só é pego se o gate ler exit code; qualquer `|| true` reabre o furo.

```

```

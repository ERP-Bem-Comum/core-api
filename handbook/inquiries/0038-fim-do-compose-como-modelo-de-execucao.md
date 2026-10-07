---
inquiry: 0038
title: 'O fim do `compose.yaml` como modelo de execução — o que o substitui, e o que ele carregava sem estar declarado'
state: open
opened: 2026-09-04
last_reviewed: 2026-09-04
open_outputs: 2 # substituto da infra de teste (§9) · existe gerador compose→taskdef no ERP-INFRA? (§4)
---

# Inquiry-0038: O fim do `compose.yaml` como modelo de execução — o que o substitui, e o que ele carregava sem estar declarado

- **Opened by:** Gabriel (tech lead), na branch `chore/oxlint-ts7-migration`
- **Asked to:** time interno · doc oficial Docker · doc oficial GitHub Actions · doc oficial AWS ECS
- **Impact:** ADR novo (candidato) · `compose.yaml` · `scripts/ci/test-integration.ts` · 2 workflows · 4 scripts de e2e

---

## 1. Contexto

Decisão do tech lead em 04/09/2026: **`Procfile` e `compose.yaml` saem como modelo de execução deste repositório.** A justificativa registrada é que a arquitetura deixou de ser VPS e passou a ser AWS ECS operada por terceiro (Codebit), que já resolve o operacional — o core-api deve declarar **apenas o que é dele**.

A investigação que se seguiu mediu o que exatamente o `compose.yaml` sustenta hoje. O resultado mudou o escopo do trabalho duas vezes, e por isso está registrado aqui em vez de virar apenas commits.

---

## 2. Pergunta(s) feita(s)

1. Qual a melhor forma de o repositório representar as unidades executáveis ("dockers que representam cada máquina") e os jobs/workers, de modo **auto-contido** e **validável por teste**?
2. Como declarar **que tipo de serviço** o sistema espera que se conecte a ele?
3. O repositório deveria ter um `Dockerfile` por unidade?
4. O que o GitHub recomenda para a infraestrutura de teste, e como ficam os secrets de integração?

---

## 3. O que foi medido

### 3.1 Topologia real, observada no CloudWatch (04/09/2026)

Convenção `/ecs/erp-bem-comum-<unidade>-<env>`, `env ∈ {hml, prd}` — 12 de 30 log groups da conta:

| Unidade | hml | prd |
| --- | :-: | :-: |
| `backend` · `frontend` | ✅ | ✅ |
| `worker-outbox` · `worker-projections` · `worker-email` | ✅ | ✅ |
| `payable-view-backfill` (job) | — | ✅ |

- A consolidação da #407 **está em produção**: 3 grupos de worker, não 6 processos.
- **`worker-van` não existe** em nenhum ambiente.
- Job one-shot já tem log group e retenção próprios (1 mês contra 6).
- ⚠️ Ausência sob esse prefixo **não** prova ausência no ar: restam 18 log groups fora do filtro.

### 3.2 Entrypoints

- **Produção:** 4 processos long-running, atrás de **2 arquivos** (`src/server.ts` e `src/workers/runner/run.ts`, este diferenciado por `WORKER_GROUP`).
- **Só local/debug:** 6 entrypoints standalone, todos com equivalente 1-para-1 em `GROUPS` (`src/workers/runner/specs.ts:456-463`), **nenhum com comportamento exclusivo**.
- **One-shot:** 8 entrypoints em 4 regimes (pré-deploy encadeado, cron, manual pós-deploy, já consumido).

### 3.3 Acoplamento ao compose

141 ocorrências em 47 arquivos fora do `handbook/`. Alcança `scripts/ci/test-integration.ts`, `compose-project.ts`, `secrets-vault.ts`, `scripts/setup/secrets.ts`, `compose.ci.yaml`, `compose.etl.yaml`, **4 scripts de e2e** (`_e2e-env.sh` e os que o usam) e 2 workflows.

### 3.4 O compose acumula três papéis

| Papel | Morre com o arquivo? |
| --- | --- |
| (a) infraestrutura efêmera de teste (`mysql`, `minio`, `mailpit`) | precisa de substituto |
| (b) process manager local (`http`, workers, jobs; `Procfile`; `pnpm dev`) | sim, sem perda |
| (c) "planta declarativa que gera os taskdefs de produção" | ver §4 — a existência do papel é contestada |

---

## 4. Divergência registrada, não resolvida

**Três artefatos afirmam** que o `compose.yaml` gera os taskdefs de produção:

- `tests/infra/module-driver-matrix-compose.test.ts:4-5`
- `tests/infra/sync-permissions-compose.test.ts:4-5`
- `.claude/rules/jobs-and-workers.md:33`

**O [ADR-0068](../architecture/adr/0068-env-fail-fast-every-environment.md):28 afirma o contrário**, literalmente:

> As variáveis de ambiente de homologação e de produção são postas manualmente, na console da AWS, por um funcionário da Codebit. Os dois ambientes são operados por terceiro, provisionados por _taskdef_, e não são configuráveis nem alcançáveis por este time — `docker-compose`, `Dockerfile` e `Makefile` deste repositório só valem para ambientes **locais**.

A divergência é de **direção**: os três textos afirmam `compose.yaml → taskdef`; o ADR afirma `console AWS → taskdef`, com o compose restrito ao local.

**Medição parcial:** `grep -i taskdef` fora do `handbook/` devolve apenas prosa — **não existe script gerador `compose → taskdef` nesta árvore**. Inclina a favor do ADR-0068, mas não fecha: o gerador poderia viver no `ERP-INFRA`, que não está neste repositório. **Verificar lá antes de concluir.**

---

## 5. `services:` do GitHub Actions está bloqueado, com razão medida

A doc oficial do GitHub descreve service containers como sendo para "bancos de dados, caches e outras ferramentas necessárias para testes de integração", com readiness declarativo (`options: --health-cmd/--health-interval/--health-retries`) — o job só começa após o serviço ficar healthy.

**Mas este repositório já avaliou e rejeitou essa opção**, e há gate ativo contra ela:

- `.github/workflows/integration.yml:9-11`: *"Cada job é uma VM isolada que sobe seu compose próprio (`docker/mysql/conf.d` + `initdb.d` montados = paridade de config; é o que faz o #519/#522 reproduzirem — o `services` nativo do Actions NÃO dá essa paridade porque sobe antes do checkout)."*
- `tests/scripts/integration-matrix-workflow.test.ts:143-152` reprova se `^\s*services:` aparecer no `integration.yml`.

**Causa técnica:** service containers sobem **antes do `checkout`**, logo não há arquivos do repositório para montar como volume. O MySQL seria o default da imagem — sem `sql_mode` STRICT, `utf8mb4_unicode_ci`, `time_zone=+00:00`, `binlog ROW` — que é justamente o que `tests/infra/mysql-compose.test.ts` CA-3..CA-15 verifica, e o que fez a **#519 (bug de produção, errno 1406)** reproduzir no CI.

**Reformulação do problema:** a escolha não é "compose × services", é **montar volume do repositório**. Qualquer mecanismo que rode depois do checkout e aceite `-v` preserva a paridade.

### Healthchecks que qualquer substituto herda

| Serviço | Comando | Fonte |
| --- | --- | --- |
| `mysql` | `mysql --protocol=tcp -h 127.0.0.1 --user=… --password="$(cat /run/secrets/…)" --execute="SELECT 1"` | `compose.yaml:194-211` |
| `minio` | `curl -fsS http://127.0.0.1:9000/minio/health/ready` | `compose.yaml:120-125` |
| `mailpit` | `/mailpit readyz` (a imagem não tem shell, curl nem wget) | `compose.yaml:244-249` |

---

## 6. Secrets de integração

Doc do GitHub: para informação **não sensível**, usar variáveis, não secrets; e **secrets não são passados ao runner em workflow disparado por fork** (exceto `GITHUB_TOKEN`) — relevante porque os repositórios são públicos.

Fato do repositório: os "secrets" de integração são valores fixos versionados em texto puro (`scripts/ci/test-integration.ts:32-36`, ex.: `rootpw-migration-test-only`). São fixtures, não segredos. Existem como arquivo apenas porque o compose os consome via `secrets: file:` (`compose.yaml:707-734`). Sem compose, `secrets-vault.ts` e a dança de backup/restore deixam de ser necessários.

---

## 7. Testes de `tests/infra/` — o que sobrevive ao fim do compose

| Arquivo | Veredito |
| --- | --- |
| `module-driver-matrix-compose.test.ts` | **SOBREVIVE** — "todo módulo persistente tem driver e URL declarados no artefato de deploy" (único guard contra #374/#444) |
| `sync-permissions-compose.test.ts` | **SOBREVIVE** — "o catálogo RBAC é sincronizado antes de a porta abrir" (sem ela a #462 volta como 403 mudo) |
| `worker-runner-compose.test.ts` | **SOBREVIVE** — "produção roda 1 processo por grupo" (Incident-0001) |
| `mysql-compose.test.ts` | **MISTO** — CA-1/2/16-19 morrem (sintaxe); CA-3..CA-15 sobrevivem (invariantes de `docker/mysql/conf.d` + `initdb.d`) |
| `migrate-compose.test.ts` | **MISTO** — CA6a..CA7 morrem; CA8 sobrevive (gerador e consumidor de secrets não podem divergir) |
| `contracts-sweeper-compose.test.ts` | **MISTO** — CA1a..CA3 morrem; CA1h sobrevive como propriedade ("job agendado não pode ter identidade fixa") |
| `minio-compose.test.ts` | **MORRE inteiro** — todas as asserções descrevem sintaxe do compose |
| `migrate-boot-inversion.test.ts` | CA-B1/CA-B3 sobrevivem (não tocam compose); CA-B2/B2b/B4 morrem |

As propriedades que sobrevivem precisam **reapontar para o artefato que substituir o compose**, sob pena de ficarem órfãs.

---

## 8. O que já foi entregue (verde no gate)

- **`src/deploy/workloads.ts`** — manifesto tipado das 13 unidades, nos três regimes do ECS (`service`/`task`/`scheduled`). Declara `name` (casa com o log group), `command`, `requires` (capacidade: tipo, nunca fornecedor), `dependsOn`, e a política de fail-fast do ADR-0068 como **estrutura**: `env` (derruba o boot) × `envWithDefault` × `envProductionOnly`, mais `constraints` (`all-or-none`, `xor`, `at-least-one`).
- **`tests/cleanup/workloads-manifest.test.ts`** — 14 asserções, ~0,4 s, sem AWS/Docker/rede.
- **`.claude/rules/jobs-and-workers.md`** — `verify.claim` atualizado e o manifesto referenciado no corpo.

Duas listas do gate são dívida explícita que **deve encolher até esvaziar**: `LOCAL_ONLY_ENTRYPOINTS` (6 standalone duplicados) e `ENV_READERS_OUTSIDE_CONFIG` (11 arquivos que leem env fora de módulo de config).

### Sobre `Dockerfile` por unidade

Medição: as unidades não diferem no conteúdo da imagem, apenas em `command` e ambiente. A doc da AWS define `family` como "a name for multiple versions of the task definition" e recomenda separar componentes em **task definitions** distintas — não em imagens distintas. N imagens permitiriam `backend` e `worker-outbox` em commits diferentes.

---

## 9. Decisão pendente

**Como substituir o papel (a), a infraestrutura efêmera de teste.** As opções levantadas, com o custo medido de cada uma:

| Opção | Paridade de config | Onde a integração roda | Custo |
| --- | --- | --- | --- |
| `services:` do Actions | **perde** (sobe antes do checkout) | só CI | bloqueado por gate ativo |
| `docker run -v ./docker/mysql/conf.d:…` | preserva | CI, Mac, x99 | reescrever 3 probes de readiness |
| compose reduzido só à infra | preserva | CI, Mac, x99 | remover ~460 linhas de aplicação; 745 → ~270 |

Questão aberta que acompanha: **manter algum caminho local de integração?** Os 4 scripts de e2e sobem MySQL via compose; se ele morrer inteiro, e2e e integração passam a existir apenas como job do Actions.

---

## 10. Próximos passos registrados

1. Decidir a opção da §9.
2. Reapontar para o manifesto as propriedades da §7 que sobrevivem, **antes** de remover os serviços do compose.
3. Verificar no `ERP-INFRA` se existe gerador `compose → taskdef` (fecha a §4).
4. Escrever o gerador de artefato a partir do manifesto (pedido do tech lead, adiado).
5. Abrir issues dos achados colaterais: `docker compose --profile workers up -d` documentado em `compose.yaml:22` **falha** (falta `--profile app`); `handbook/infrastructure/03-secrets-catalog.md:56` cataloga `BRADESCO_VAN_HOST`, ausente do código, enquanto `VAN_S3_*` não aparece no `handbook/infrastructure/`; `withNewCorrelation` não cobre nenhum worker de outbox ou projeção; `migrate` roda 7 módulos e duas prosas dizem 6; `--experimental-strip-types` residual em 4 lugares.

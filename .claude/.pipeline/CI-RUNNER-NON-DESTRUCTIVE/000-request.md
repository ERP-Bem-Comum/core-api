# CI-RUNNER-NON-DESTRUCTIVE — escopo (Parte A da #500)

> Size **S**. Torna o runner de integração (`scripts/ci/test-integration.ts`) **não-destrutivo** para o
> ambiente de dev **local** — o título da #500. Duas mudanças cirúrgicas: **projeto Docker isolado** +
> **preservar os secrets do dev**. Sinal verde da P.O. + Gabriel (2026-07-22); dano é **só local**
> (confirmado: `docker compose` fala com o Docker local, testes conectam em `127.0.0.1`, produção é
> AWS ECS+RDS — inalcançável por compose local).

## Problema (verificado)
`scripts/ci/test-integration.ts`:
- `:265` — `dockerDown()` = `docker compose down -v` **no projeto default `core-api-dev`** → apaga o
  volume `mysql-data` do **banco de dev local**.
- `:261` — `docker compose up` também no projeto `core-api-dev` (mesmo projeto do dev).
- `writeTestSecrets()`/`removeTestSecrets()` — **sobrescrevem e apagam** `secrets/{mysql_root,mysql_app,
  mysql_readonly}_password.txt` (os do dev; o compose lê de caminhos fixos `./secrets/*.txt`).

Consequência: rodar `pnpm run test:integration:*` **destrói o banco e os secrets locais de dev**. Ninguém
usa → cada um faz ritual manual arriscado.

## Escopo (in) — só `scripts/ci/test-integration.ts`
1. **Projeto Docker isolado:** `up`/`down` passam a usar `docker compose -p core-api-test ...`
   (constante `TEST_COMPOSE_PROJECT`). O `down -v` remove só `core-api-test_*` — **nunca**
   `core-api-dev_mysql-data`.
2. **Secrets preservados (backup/restore):** antes de escrever os secrets de teste, **fazer backup** de
   qualquer `secrets/<n>.txt` existente (ex.: renomear para `.dev-bak`); no `finally`, **restaurar** os
   backups e remover só os arquivos de teste que não tinham backup. O dev que tinha secrets os recupera
   byte-a-byte; o dev que não tinha fica limpo (como hoje).

## Fora de escopo (é a Parte B / C da #500, ficam com o Gabriel)
- Porta configurável / helper único (os 68 arquivos que fixam `127.0.0.1:3306`) — **coexistência sem
  parar o dev** e CI. É a Parte B.
- Workflow de CI para integração MySQL (Parte C).
- Caso protegido `sync-permissions` (relevante só na Parte B).

> Com a Parte A, o **ritual seguro** passa a ser: parar o dev → `test:integration` (projeto isolado,
> volume próprio, na 3306 com o dev parado) → `down -v` só do projeto de teste → religar o dev **intacto**.
> Destrava a prova do épico #502 (âncoras R$55/R$5.500) sem esperar a Parte B.

## Critérios de aceite
- **CA1** O `up` e o `down -v` do runner usam o projeto **`core-api-test`** (não o default). Verificável
  no comando montado (o array passado ao `spawnSync` contém `-p core-api-test`).
- **CA2** Backup/restore de secrets: **Dado** um `secrets/mysql_root_password.txt` de dev com conteúdo X,
  **Quando** o ciclo do runner (write→...→finally restore) roda, **Então** o arquivo volta com o conteúdo
  **X** (não o de teste, não apagado). Testável em `pnpm test` puro (fs, sem Docker).
- **CA3** Secret que **não** existia antes: nasce com o valor de teste durante, e é **removido** no fim
  (comportamento de hoje para quem não tinha secrets).
- **CA4** Regressão zero no fluxo do runner: `up`→`test`→`down` segue funcionando (o projeto isolado sobe
  os mesmos serviços); nenhuma suíte muda de resultado.
- **CA5** O `down -v` **nunca** roda no projeto default — garantido pelo `-p core-api-test` em ambos os
  comandos (sem caminho onde `dockerDown` omita o projeto).

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — backup/restore de secrets (fs, testável) + estrutural do `-p core-api-test` |
| W1 | `nodejs-process-runner` (par `nodejs-fs-scripter`) | projeto isolado + backup/restore |
| W2 | `code-reviewer` | audit read-only (nenhum caminho destrutivo no projeto default; secrets restaurados) |
| W3 | `ts-quality-checker` | gate |

# CI-INTEGRATION-MATRIX — W0 (teste RED)

> Ticket size **S** · fecha a issue **#523** · design em `.claude/.planning/ci-integration-gate-523/`.
> Adaptação do W0 a um workflow de CI: um workflow do GitHub Actions não tem `node:test` RED óbvio,
> então o "teste" assere a **ESTRUTURA** do `.github/workflows/integration.yml` via `readFileSync`
> + regex (molde de `tests/scripts/test-integration-notifications-script.test.ts`). O arquivo lê o
> workflow com `tryRead` (devolve `''` quando ausente) → **RED agora**, porque o W1 ainda não o criou.

## Arquivo de teste

`tests/scripts/integration-matrix-workflow.test.ts` — 14 `it()` (13 assertivos + 1 `skip` para o CA4).

## Como o RED foi produzido

Cada `it()` chama primeiro o guard `present()` (`assert.ok(wf.length > 0, ...)`). Como o workflow
não existe, `tryRead` devolve `''`, o guard falha, e o `it()` fica vermelho **por AUSÊNCIA do
arquivo** — nunca por erro de sintaxe do teste (o teste compila: `typecheck` verde; formata:
`prettier --check` verde). É o RED-first correto: as invariantes só ficam verdes quando o W1
escrever o `integration.yml` honrando o DRAFT.

## Mapa caso -> CA

| `describe` / `it`                                                     | CA           | O que assere sobre o texto do workflow                                                                            |
| -------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| CA1 · job integration + strategy.matrix.suite + fail-fast:false      | CA1          | job `integration`, blocos `strategy`/`matrix`/`suite`, `fail-fast: false`                                         |
| CA1 · inclui as 13 suítes (10 MySQL + 3 MinIO)                       | CA1          | cada suíte presente como item de matrix (regex ancorada; `etl` não casa `etl:orchestrate`)                       |
| CA1 · NÃO inclui etl:budget-plans nem notifications                 | CA1          | `doesNotMatch` do item de matrix (menção em comentário não conta — âncora exige `- ` no início da linha)          |
| CA1 · gatilhos on:                                                   | CA1          | `pull_request` p/ `[dev, main]`, `schedule` + `cron`, `workflow_dispatch`                                         |
| CA2 · invoca scripts/ci/test-integration.ts com ${{ matrix.suite }} | CA2          | linha de execução chama o runner com a suíte da matrix                                                            |
| CA2 · NÃO usa services: nativo                                       | CA2          | ausência de `^\s*services:` (chave de job) — comentário do DRAFT não casa                                         |
| CA3 · continue-on-error:true                                         | CA3          | job da matrix em report-only                                                                                      |
| CA4 · matriz de resultado esperada                                   | CA4          | **`skip` com razão** — comportamento de CI, verificável só no W3; documentado, não asserido                       |
| CA5 · job gate needs:[integration] + if:always()                    | CA5          | job `gate`, `needs: [integration]`, `if: always()`                                                               |
| CA5 · gate confere needs.integration.result == success              | CA5          | leitura de `needs.integration.result` + comparação a `success`                                                   |
| CA6 · actions pinadas por SHA de 40 hex                             | CA6          | todo `uses:` casa `@[0-9a-f]{40}$` (ADR-0011)                                                                     |
| CA6 · concurrency cancel-in-progress:true                           | CA6          | bloco `concurrency` cancelando runs redundantes                                                                  |
| Segurança do gate · nenhum run: com \|\| true                      | (invariante) | `doesNotMatch` de `\|\| true` nas linhas não-comentário — o furo do #521 (`cancelled 1 / fail 0`, mas `exit 1`)  |
| MinIO · pnpm run secrets:setup ANTES do runner                     | (CA2/Q5)     | step `secrets:setup` presente e antes da invocação do runner (o runner só cria os secrets do MySQL)             |

## Saída literal do RED

```
ℹ tests 14
ℹ pass 0
ℹ fail 13
ℹ skipped 1
```

Exemplo de falha (todas idênticas na causa — guard de ausência):

```
✖ NENHUM step `run:` contém `|| true` (engoliria o exit code do runner — furo do #521)
  AssertionError [ERR_ASSERTION]: workflow .github/workflows/integration.yml ausente —
  o W1 ainda não o escreveu (RED esperado)
      at present (.../tests/scripts/integration-matrix-workflow.test.ts:52:10)
```

Gates de sanidade do próprio teste (o RED é asserção, não erro de tipo/formatação):

```
$ pnpm run typecheck   -> tsc --noEmit  (sem erros)
$ pnpm exec prettier --check tests/scripts/integration-matrix-workflow.test.ts
  All matched files use Prettier code style!
```

## CA4 — matriz de resultado esperada (documentação; verificável só no W3)

Não dá para asserir em unit: é **comportamento de CI** (quais suítes passam/falham num run real de
MySQL/MinIO), não uma propriedade do texto do arquivo. Registrado como `it(..., { skip })` para
ficar visível na saída, sem fingir cobertura. A validação real é no W3, via `workflow_dispatch`.

| Suíte             | Esperado    | Issue do vermelho                  |
| ----------------- | ----------- | ---------------------------------- |
| contracts         | verde       | —                                  |
| auth              | verde       | —                                  |
| programs          | verde       | —                                  |
| etl:contracts     | verde       | —                                  |
| etl:financial     | verde       | —                                  |
| storage           | verde       | — (precisa `secrets:setup`)        |
| photo             | verde       | — (precisa `secrets:setup`)        |
| logo              | verde       | — (precisa `secrets:setup`)        |
| financial         | vermelho    | **#519** (bug de PROD, errno 1406) |
| budget-plans      | vermelho    | **#520**                           |
| partners          | vermelho    | **#521**                           |
| etl               | vermelho    | **#522**                           |
| etl:orchestrate   | vermelho    | **#522**                           |

O "verde" do W3 é **esta matriz reproduzida** (report-only via `continue-on-error: true`), NÃO
"tudo verde" — os 4 defeitos seguem abertos, e report-only é o correto na Fase 0.

## Premissa que o W1 deve honrar (invariantes exatas p/ o GREEN)

O W1 escreve `.github/workflows/integration.yml` a partir do DRAFT da §8 do `CI-INTEGRATION-DESIGN.md`
satisfazendo, literalmente:

1. **Job `integration`** com `strategy.matrix.suite` contendo **exatamente as 13** suítes
   (`contracts, auth, partners, programs, budget-plans, financial, etl, etl:orchestrate,
   etl:contracts, etl:financial, storage, photo, logo`) e **`fail-fast: false`**. Sem
   `etl:budget-plans` nem `notifications` como itens da matrix.
2. **`on:`** com `pull_request: branches: [dev, main]`, `schedule` (cron) e `workflow_dispatch`.
3. **Step de execução** invoca `scripts/ci/test-integration.ts "${{ matrix.suite }}"`.
4. **Sem `services:` nativo** (chave de job) — sobe o compose do runner (paridade `conf.d`/`initdb.d`).
5. **`continue-on-error: true`** no job da matrix (report-only, Fase 0).
6. **Job `gate`** com `needs: [integration]`, `if: always()`, conferindo
   `needs.integration.result` **== `success`**.
7. **Actions pinadas por SHA** de 40 hex (reaproveitar os SHAs já em uso no `ci.yml`) e
   **`concurrency`** com `cancel-in-progress: true`.
8. **Step `pnpm run secrets:setup` ANTES** da invocação do runner (as suítes MinIO têm
   `secrets:false` no manifesto — o runner não cria `minio_root_user/password`).

### AVISO — aperto sobre o DRAFT: `|| true` proibido em qualquer `run:`

A invariante de segurança do gate assere **ausência total de `|| true`** nas linhas não-comentário.
O DRAFT da §8 traz um `|| true` no step de diagnóstico
(`run: docker compose ps -a && docker compose logs --tail=100 || true`). Para o GREEN, **o W1 deve
remover esse `|| true`** — ex.: escrever o diagnóstico como bloco `run: |` com os dois comandos em
linhas separadas, sem o `|| true`. O step já roda sob `if: failure()`; se um comando de diagnóstico
falhar, é inofensivo (o job já está vermelho). A regra existe para nunca engolir o `exit 1` do
runner — o furo do #521 (`cancelled 1 / fail 0`, mas sai 1). Menções a `|| true` em **comentário**
são toleradas (a asserção ignora linhas que começam com `#`).

## Comando de repro

```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings \
  tests/scripts/integration-matrix-workflow.test.ts 2>&1 | tail -30
```

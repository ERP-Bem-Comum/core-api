# CI-INTEGRATION-MATRIX — W1 (implementação → GREEN)

> Ticket size **S** · fecha **#523** · trabalho aditivo na `dev` (um workflow novo, nenhum arquivo
> tracked existente tocado). A spec do W1 é o teste do W0 (`tests/scripts/integration-matrix-workflow.test.ts`);
> o GREEN é o teste passar inteiro (13 asserts + 1 skip do CA4).
> **Executor:** `docker-compose-expert` (desenhou o workflow no W-planning).

## Entregável

`.github/workflows/integration.yml` — novo. Roda o runner existente `scripts/ci/test-integration.ts`
uma vez por suíte, numa matrix do GitHub Actions (`fail-fast: false`, `continue-on-error: true`),
disparando em PR para `dev`/`main` + nightly (cron) + `workflow_dispatch`. Job agregador `gate`
(`needs: [integration]`, `if: always()`) confere `needs.integration.result == 'success'`.

## Prova do GREEN (verificada na sessão principal, não só reportada pelo agente)

```
node --test … tests/scripts/integration-matrix-workflow.test.ts
ℹ tests 14 · pass 13 · fail 0 · skipped 1   (o skip é o CA4)
```

W0 (workflow ausente): `pass 0 / fail 13`. W1: `pass 13 / fail 0`. Δ = 13 asserts do RED ao GREEN.

## Invariantes do W0 → onde no YAML

| Invariante | Satisfeita em |
| --- | --- |
| job `integration` + `strategy.matrix.suite` + `fail-fast:false` | bloco `strategy` |
| 13 suítes (10 MySQL + 3 MinIO) | itens `- contracts … - logo` |
| NÃO inclui `etl:budget-plans` nem `notifications` | citados só em comentário, nunca como item da matrix |
| `on:` = PR(dev/main) + schedule(cron) + workflow_dispatch | bloco `on:` |
| invoca runner com `${{ matrix.suite }}` | step "Integração" |
| sem `services:` nativo | nenhum job tem a chave |
| `continue-on-error: true` | `jobs.integration` |
| job `gate` (`needs:[integration]` + `if:always()` + `result==success`) | `jobs.gate` |
| actions pinadas por SHA 40-hex + `concurrency` cancel-in-progress | reuso dos SHAs do `ci.yml` |
| nenhum `run:` com `|| true` | step de diagnóstico reescrito sem `|| true` |
| `secrets:setup` antes do runner (MinIO) | step "Gera secrets de teste" |
| CA4 (matriz esperada) | `skip` — comportamento de CI, verificável só no W3 |

## Prova de parse do YAML

Sem parser YAML no projeto (ADR-0011: zero dependência nova). Parse via `python3` do host (não altera
o projeto): `jobs: ['integration', 'gate']`; matrix com as 13 suítes exatas do manifesto do runner.
`actionlint` não instalado e não introduzido.

## Divergências do DRAFT (§8 do design)

1. **`|| true` REMOVIDO** (correção mandatória que o W0 impôs). O DRAFT trazia
   `docker compose logs … || true` no step de diagnóstico; a invariante de segurança do gate proíbe
   `|| true` em qualquer `run:` (furo do #521 — exit code do runner engolido). Reescrito como bloco
   `run: |` de 2 linhas, sob `if: failure()`. É o defeito que o W0 pegou no meu próprio rascunho.
2. **Aspas simples** (`'24'`, `'0 5 * * *'`) — `.prettierrc.json` tem `singleQuote:true` e `.github/`
   não está no `.prettierignore`; o regex do W0 aceita ambas.
3. Nenhuma outra divergência.

## Gates de sanidade

`pnpm exec prettier --check .github/workflows/integration.yml` → verde. `pnpm run typecheck` → verde.
Nada tracked modificado; sem commit/push; `pipeline:state` não tocado pelo agente.

## Pendente

- **W2** — review read-only: conferir SHAs pinados, `fail-fast:false`, ausência de `|| true`,
  `secrets:setup` antes do runner, e o job `gate`.
- **W3** — run real via `workflow_dispatch` numa branch. "Verde" do W3 = a matriz do CA4 reproduzida
  (verdes: `contracts,auth,programs,etl:contracts,etl:financial,storage,photo,logo`; vermelhos
  esperados: `financial`#519, `budget-plans`#520, `partners`#521, `etl`+`etl:orchestrate`#522), NÃO
  "tudo verde" — os 4 defeitos ainda estão abertos e report-only é o correto.

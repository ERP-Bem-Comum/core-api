# CI-INTEGRATION-MATRIX — escopo

> Size **S** (um workflow novo, aditivo, sem `src/`). Fecha a issue **#523**: as suítes MySQL/MinIO
> de integração não rodam em nenhum workflow — 14 das 15 suítes do runner nunca são executadas em CI,
> o que deixou 4 defeitos latentes na `dev`, um deles bug de produção (#519).

## Problema

`.github/workflows/ci.yml` roda só `pnpm test` (unit, offline). O único job de integração é
`integration-notifications.yml` (Mailpit, path-filtrado). Nenhum workflow chama
`scripts/ci/test-integration.ts` para as suítes `contracts`, `auth`, `partners`, `programs`,
`budget-plans`, `financial`, `etl*`, `storage`, `photo`, `logo`. O gate de qualidade do projeto
(W3) é, portanto, **cego para a camada de integração**.

## Alvo

Um workflow novo `.github/workflows/integration.yml` que roda o runner **existente** uma vez por
suíte, numa **matrix** do GitHub Actions (`fail-fast: false`), disparando em todo PR para `dev`/`main`
+ nightly + `workflow_dispatch`. Cada job sobe seu próprio MySQL/MinIO efêmero via o `docker compose
up` do runner.

Design completo e DRAFT do YAML: `.claude/.planning/ci-integration-gate-523/CI-INTEGRATION-DESIGN.md`.
Fundamentação de arquitetura/gating (Pirâmide Prática de Vocke + Quadrantes Ágeis):
`.claude/.planning/ci-integration-gate-523/TEST-ARCH-ANALYSIS.md`.

## Decisões de design (já fechadas na investigação)

1. **Matrix por suíte, não job sequencial** — o runner já é per-suíte; a matrix dá check
   verde/vermelho por suíte e some o conflito de porta (VMs isoladas).
2. **`docker compose up` do runner, NÃO `services:` nativo** — `services:` sobe antes do checkout e
   não monta `docker/mysql/conf.d` (`sql_mode=STRICT_ALL_TABLES`); é essa config que faz o #519
   (errno 1406) reproduzir. `services:` cru mascararia o bug de produção.
3. **Rollout report-only → required** — entra com `continue-on-error: true`; vira required (via job
   agregador `gate`) só depois que #519/#520/#521/#522 fecharem, senão a `dev` nasce com 5 jobs
   vermelhos.
4. **Confiar no exit code, nunca no sumário do `node:test`** — o #521 sai com `exit 1` mas
   `fail 0 / cancelled 1`; qualquer `|| true` reabre o furo.
5. **`etl:budget-plans` fica de fora** (dump legado ausente); **`notifications` fica de fora** (já
   coberta). **Suítes MinIO precisam de `pnpm run secrets:setup`** antes do runner (o runner só cria
   os secrets do MySQL).

## Critérios de aceite

- [ ] **CA1** — `integration.yml` roda o runner por suíte em matrix (`fail-fast: false`), em PR para
      `dev`/`main` + nightly + `workflow_dispatch`.
- [ ] **CA2** — Sobe o compose do runner (paridade `conf.d`/`initdb.d`), não `services:` nativo.
- [ ] **CA3** — Entra **report-only** (`continue-on-error: true`); nenhuma proteção de branch alterada
      nesta fatia.
- [ ] **CA4** — 1ª execução real (via `workflow_dispatch` numa branch) bate com o esperado: verdes =
      `contracts, auth, programs, etl:contracts, etl:financial, storage, photo, logo`; vermelhos
      esperados = `financial (#519), budget-plans (#520), partners (#521), etl + etl:orchestrate (#522)`.
- [ ] **CA5** — Job agregador `gate` presente (inerte na Fase 0 por causa do `continue-on-error`),
      pronto para virar o único required status check na Fase 2.
- [ ] **CA6** — Actions pinadas por SHA (ADR-0011); `concurrency` com `cancel-in-progress`.

## Disciplina de waves (adaptada a workflow de CI)

Um workflow do GitHub Actions não tem `node:test` RED. A pipeline adapta:

- **W0** — validar o YAML (lint/parse) e **registrar a matriz de resultado esperada** (CA4) como o
  "teste" a satisfazer: quais suítes devem passar e quais devem falhar, com o número de issue de cada
  vermelho. É o RED conceitual — a asserção sobre o comportamento do CI antes de ele existir.
- **W1** — escrever o `integration.yml` a partir do DRAFT revisado.
- **W2** — review read-only do workflow (o design doc já cobre a maior parte; conferir SHAs pinados,
  `fail-fast: false`, ausência de `|| true`, `secrets:setup` nas suítes MinIO).
- **W3** — execução real via `workflow_dispatch` numa branch, conferindo que o resultado bate com a
  matriz esperada do CA4. O "verde" do W3 aqui é **a matriz esperada reproduzida**, não "tudo verde"
  (os 4 defeitos ainda estão abertos — report-only é o correto).

## Fora de escopo (follow-ups, NÃO nesta fatia)

- Virar o gate **required** no branch protection — Fase 2, depende de #519/#520/#521/#522 fecharem.
- Corrigir os 4 defeitos — cada um no seu ticket.
- `etl:budget-plans` (dump legado — #522), cobrir `tests/jobs/**/*.integration` (#360), bucket do
  `minio-bootstrap`, e a #500 (`down -v` destrutivo em dev).
- A dívida de isolamento intra-suíte — issue **#535**.

## Rastreio

Issue #523 · design em `.claude/.planning/ci-integration-gate-523/` · precedente `CI-NOTIFICATIONS-MAILPIT`.

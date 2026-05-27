# Handoff de sessão — 2026-05-27

Snapshot para retomar o trabalho em outra máquina. Não é artefato de ticket; é o estado vivo
da sessão no momento da troca de PC.

## Branch

- `wip/checkpoint-2026-05-25` — **38 commits à frente** de `origin/main`, 0 atrás. Branch WIP,
  ainda **não** mergeada para `main`. Sem PR aberto.
- Após o commit/push desta sessão, o remoto `origin/wip/checkpoint-2026-05-25` fica em dia.

## O que foi feito nesta sessão

1. **Avaliação E2E com infra real** (MySQL 8.4 + MinIO via compose):
   - Estático verde (typecheck/lint/format).
   - Unit 1188/0, integração MySQL 82/82, storage MinIO 8/8.
   - Smoke manual da CLI `--driver mysql`: criar-contrato → aditivo → documento → homologar
     (valor vigente 100k→120k) → outbox 6 eventos → worker drenou 6/6, 0 DLQ.
   - Achado: `test:integration` usava `chmod 600` nos secrets → seed `readonly_bi` falha.

2. **CTR-INFRA-INTEGRATION-SECRET-PERMS** (S) — **closed-green**, já commitado (`1a1704a`) e
   pushed. Fix `chmod 600`→`644` no `package.json#test:integration` + teste de regressão
   estático `tests/infra/integration-script-secret-perms.test.ts`.

3. **CTR-PIPELINE-WAVE-REOPEN** (S) — **closed-green** (W0..W3, este commit). Adiciona
   subcomando `pnpm run pipeline:state wave-reopen <ticket> <Wn> [--agent]` que modela o ciclo
   `W2 REJECTED → fix → re-review → APPROVED` sem editar STATE.json à mão. 5 testes (CA-1..CA-5)
   em `tests/pipeline/state-cli.test.ts`. `pnpm test` full 1212/1196 pass/0 fail.
   - Arquivos: `scripts/pipeline/state-cli.ts` (nova `cmdWaveReopen`), `CLAUDE.md` (§Pipeline
     state), `tests/pipeline/state-cli.test.ts`.
   - Dogfood: o `close` deste ticket usou o fluxo normal; o `wave-reopen` em si está testado.

## Estado do pipeline

- **57 closed / 1 open**.
- **Único ticket aberto:** `CTR-INFRA-READONLY-BI-GRANT` (S) — todas as waves `pending`, ainda
  não iniciado. É o próximo candidato natural ao retomar.

## Próximos passos sugeridos (ao voltar)

1. Rodar `pnpm run pipeline:status --filter open` para reconfirmar.
2. Atacar `CTR-INFRA-READONLY-BI-GRANT` (ler seu `000-request.md` antes).
3. Em algum momento: decidir promoção de `wip/checkpoint-2026-05-25` → PR para `main`
   (38 commits acumulados).

## Notas de ambiente

- Docker daemon é único na máquina e compartilhado com o **legacy** (`erp-prod-*`). O hook
  `block-cross-project-docker.sh` bloqueia comandos mirando o legacy e prunes globais. Subir o
  stack do core: `docker compose up -d mysql --wait` (secrets em `0644`, não `0600`).
- `pnpm` sempre; `npm` bloqueado por hook (ADR-0012).

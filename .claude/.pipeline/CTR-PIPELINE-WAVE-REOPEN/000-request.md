# CTR-PIPELINE-WAVE-REOPEN — Request

**Size:** S
**Origem:** dívida de tooling registrada no W2 de `CTR-INFRA-READONLY-BI-AUTH`
(ver `.claude/.pipeline/CTR-INFRA-READONLY-BI-AUTH/004-code-review/REVIEW.md` §"Nota de processo").

## Problema

`scripts/pipeline/state-cli.ts` é **forward-only** e não modela o ciclo natural de revisão
`W2 REJECTED → fix no W1 → W2 re-revisão → APPROVED`. Hoje:

- `wave-finish W2 --outcome REJECTED` marca a wave como `status: 'done'`
  (`scripts/pipeline/state-cli.ts:186-…`).
- `wave-start W2` recusa reabrir: `wave ${wave} já está done — não é possível reiniciar`
  (`scripts/pipeline/state-cli.ts:144-146`).
- `wave-finish W2` recusa de novo: `wave ${wave} não está in-progress`
  (`scripts/pipeline/state-cli.ts:179-184`).
- `wave-round W2` só incrementa o contador `rounds` (`:223-226`), **sem** alterar `status`
  nem `outcome`.

Consequência prática vivida em `CTR-INFRA-READONLY-BI-AUTH`: o W2 ficou travado em
`outcome: REJECTED` mesmo após o fix do Round 2 ter sido aprovado. A correção exigiu **editar o
`STATE.json` à mão** (mudar `outcome` para `APPROVED`) + `pipeline:state render` — violando a
convenção "STATE.json é gerenciado por `pnpm run pipeline:state`" do CLAUDE.md raiz.

## Objetivo

Permitir reabrir uma wave `done` para um novo round, de forma auditável, sem edição manual do
canônico. O ciclo REJECTED→re-review deve ser expressável só com comandos da CLI.

## Proposta (a refinar no W0/W1)

Adicionar subcomando **`wave-reopen <ticket> <Wn> [--agent <a>]`** que:

- só aceita wave com `status: 'done'` cujo `outcome` seja **`REJECTED`** (o único outcome que
  justifica re-trabalho); demais outcomes → erro claro.
- exige que **nenhuma wave posterior** já esteja `in-progress`/`done` (não reabrir W2 se W3 já
  rodou) — senão erro.
- transiciona a wave de volta para `status: 'in-progress'`, incrementa `rounds` (respeitando
  `MAX_ROUNDS = 3`, `state-cli.ts:29`), limpa `outcome`/`finishedAt`, seta `startedAt = now`.
- após `wave-reopen`, o fluxo normal `wave-finish --outcome APPROVED|REJECTED` volta a funcionar.

Alternativa a avaliar no W0: em vez de novo subcomando, deixar `wave-start` reabrir wave `done`
quando o outcome for `REJECTED`. Decidir pelo design mais simples e testável.

## Critérios de aceite

- **CA-1:** `wave-reopen` (ou equivalente) transiciona uma wave `done`+`REJECTED` para
  `in-progress`, incrementa `rounds`, e limpa `outcome`/`finishedAt`.
- **CA-2:** Após `wave-reopen`, `wave-finish --outcome APPROVED` fecha a wave com o novo outcome
  e re-renderiza o `STATE.md`.
- **CA-3:** `wave-reopen` recusa wave com outcome ≠ `REJECTED` (ex.: `GREEN`, `ALL-GREEN`,
  `APPROVED`) com mensagem clara e exit ≠ 0.
- **CA-4:** `wave-reopen` recusa se alguma wave **posterior** não estiver `pending` (evita
  reabrir W2 depois de W3 já ter rodado).
- **CA-5:** Respeita `MAX_ROUNDS = 3` — a 4ª tentativa de round escala ao humano (mesma regra de
  `wave-round`, `state-cli.ts:219-221`).
- **CA-6:** Testes em `tests/pipeline/state-cli.test.ts` cobrindo CA-1..CA-5; `pnpm test` verde.
- **CA-7:** `--help`/uso e o CLAUDE.md raiz (§"Pipeline state") atualizados com o novo comando.

## Fora de escopo

- Refatorar o modelo de waves para máquina de estado genérica.
- Histórico multi-round persistido por round (hoje `rounds` é um contador; manter assim).
- Dashboard/metrics — só consomem `STATE.json`, não mudam aqui.

## Notas

- Arquivos prováveis: `scripts/pipeline/state-cli.ts`, `tests/pipeline/state-cli.test.ts`,
  e a doc de comandos no `CLAUDE.md` raiz.
- Schema de `STATE.json`: `schemaVersion: 1` — a mudança não precisa bump (campos já existem;
  muda só a transição permitida).

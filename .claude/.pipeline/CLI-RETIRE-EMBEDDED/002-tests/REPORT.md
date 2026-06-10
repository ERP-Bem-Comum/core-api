# 002 — W0 (baseline) — CLI-RETIRE-EMBEDDED

Ticket de **remoção** (ADR-0037) — não há "teste RED" a escrever; a disciplina aqui é manter a
suíte verde após arrancar a CLI, e provar que as capacidades de infra que viviam na CLI (worker do
outbox) seguem funcionando via novo entrypoint standalone.

## Baseline (antes da cirurgia)
- `pnpm test`: verde (2704 pass / 0 fail / 19 skipped na última run do ticket anterior).
- `pnpm run test:integration`: verde (91/91) — inclui `outbox-worker.integration.test.ts` (runLoop
  contra MySQL real), que cobre a lógica do worker independente do entrypoint.

## Rede de segurança para a remoção
- Lógica do worker (`worker/outbox-worker.ts` runOnce/runLoop) já tem testes unit + integração —
  o novo entrypoint `worker/run.ts` é wiring fino sobre ela.
- `readWorkerConfig` (parsing de env) será coberto por teste unit novo (substitui o teste do antigo
  comando CLI `run-outbox-worker`).
- Sem reverse-deps: nada fora de `cli/` importa de `cli/` (grep verificado).

W1: cirurgia. W3 reconfirma verde + build da imagem.

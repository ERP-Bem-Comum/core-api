# W0 — Testes RED · CORE-WORKER-CONSOLIDATION-DEPLOY

**Skill:** tdd-strategist (disciplina) + padrão `tests/infra/contracts-sweeper-compose.test.ts` (test-pyramid: camada infra estrutural).

## Arquivo

- `tests/infra/worker-runner-compose.test.ts` (novo)

## Contrato expresso (CA-1..CA-6)

Valida, via `docker compose --profile workers config --format json` (parse-only, sem subir container):

- **CA-1:** profile `workers` ativa **exatamente** `worker-outbox`, `worker-projections`, `worker-email`.
- **CA-1b:** nenhum dos 6 nomes standalone (`outbox-contracts`…`email-dispatch`) sobrevive.
- **CA-2:** cada grupo executa `src/workers/runner/run.ts` — **não** `server.ts` nem `run.ts` por-worker.
- **CA-3:** `WORKER_GROUP` = `outbox`/`projections`/`email` (env resolvido).
- **CA-4:** união de secrets por grupo (serviço + declaração top-level).
- **CA-5:** hardening preservado (cap_drop ALL + read_only + no-new-privileges + depends_on mysql healthy).
- **CA-6:** opt-in — sem `--profile workers`, nenhum grupo é ativado.

## Estado RED

Docker CLI **não está instalado neste Mac** → o skip-guard (`FIN-TEST-INFRA-SKIP-GUARD`) pula a suíte localmente (nunca falha por ambiente). A prova mecânica RED→GREEN roda onde há `docker compose` (CI/x99) — parte do W3.

Prova **estrutural** do RED (parse direto do `compose.yaml`, sem docker):

```
serviços de GRUPO (esperados pós-W1): AUSENTES
  worker-outbox        ausente (RED ✓)
  worker-projections   ausente (RED ✓)
  worker-email         ausente (RED ✓)

serviços LEGADOS standalone: PRESENTES (serão removidos no W1)
  outbox-contracts, outbox-partners, supplier-projection,
  payable-projection, contract-count-projection, email-dispatch
```

Com `docker compose` presente, CA-1/CA-1b/CA-2/CA-3/CA-4/CA-5 falham (serviços de grupo inexistentes). RED válido.

## Resultado

```
node --test tests/infra/worker-runner-compose.test.ts
﹣ CORE-WORKER-CONSOLIDATION-DEPLOY — 6→3 workers no compose (W0)  # skip: Docker CLI ausente no PATH
```

RED (por inexistência dos serviços de grupo). Próximo: W1 reescreve a seção `workers` do compose 6→3.

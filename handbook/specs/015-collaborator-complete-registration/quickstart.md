# Quickstart — Execução serializada da Feature 015

> **Invariante:** uma US por vez, gate W3 verde antes da próxima, **uma migration por vez**. Nunca rodar `db:generate` de duas US em paralelo (causa-raiz do reset #83–86).

## Ordem

| #   | Ticket                                     | Size | Migration | Pré-condição                      |
| --- | ------------------------------------------ | ---- | --------- | --------------------------------- |
| 1   | `PAR-PARTNER-BANK-PIX` (US1)               | M    | `0010`    | —                                 |
| 2   | `PAR-COLLABORATOR-PROFILE-FIELDS` (US2)    | M    | `0011`    | US1 mergeada                      |
| 3   | `PAR-COLLABORATOR-TERRITORY` (US3)         | S    | `0012`    | US2 mergeada                      |
| 4   | `PAR-COLLABORATOR-HISTORY-EXPORT` (US4)    | L    | `0013`    | US3 mergeada                      |
| 5   | `PAR-COLLABORATOR-SELF-REGISTRATION` (US5) | L    | `0014`    | US4 mergeada                      |
| 6a  | `CTR-CONTRACT-EVENT-CONTRACTOR-REF` (US6a) | M    | —         | **ADR-0046 aceito**; US5 mergeada |
| 6b  | `PAR-CONTRACT-COUNT-READMODEL` (US6b)      | L    | `0015`    | US6a mergeada                     |

## Ciclo por ticket (W0→W3)

```bash
# init do ticket
pnpm run pipeline:state init <TICKET> --size <S|M|L>

# W0 (RED) — tdd-strategist: testes falham por inexistência da API
pnpm run pipeline:state wave-start <TICKET> W0 --agent tdd-strategist
pnpm test                                  # deve falhar (RED)
pnpm run pipeline:state wave-finish <TICKET> W0 --outcome RED --report 002-tests/REPORT.md

# W1 (GREEN) — implementação mínima + schema
#   ts-domain-modeler → drizzle-schema-author → zod-expert (borda)
pnpm run db:generate                       # gera a migration 00NN (uma por vez!)

# W2 (read-only) — code-reviewer (US5: web-security-backend)
# W3 (gate) — ts-quality-checker
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
pnpm run test:integration:partners         # round-trip de persistência
pnpm run pipeline:state close <TICKET>
```

## US6 — passos extras (cross-BC)

1. **ADR-0046 primeiro** (read-model `partners←contracts` + `contractorRef`) — com citação canônica (Princípio IX). Sem ADR aceito, US6 não entra em W0.
2. **6a (`ctr_*`)**: enriquecer payload dos eventos de integração do Contratos com `contractorRef` (adapter, Opção A) + testes de contrato.
3. **6b (`par_*`)**: `par_contract_count_view` + worker `src/workers/contract-count-projection/` + backfill (`ctr_job_runs`) + grids batch-count + filtro `contractStatus`.
4. Validar idempotência (reentrega/fora-de-ordem) e degradação `0/0`.

## Validação E2E

- Coleções Bruno (ADR-0034) por US + `fastify.inject` nas rotas novas.
- Backward-compat: colaborador/financiador legado segue válido em leitura/edição.

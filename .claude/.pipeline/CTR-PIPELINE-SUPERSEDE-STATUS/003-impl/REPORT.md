# W1 (GREEN) — CTR-PIPELINE-SUPERSEDE-STATUS

**Skill:** ports-and-adapters (tooling/infra — implementação mínima)
**Data:** 2026-05-27
**Resultado:** 🟢 GREEN — 9 RED do W0 viram verde; suíte completa 1187/0; typecheck limpo.

## Implementação (mínima, YAGNI)

| Arquivo | Mudança | CA |
| :--- | :--- | :--- |
| `scripts/pipeline/state-schema.ts` | `TicketStatus += 'superseded'`; campo opcional `supersededBy?: string` (fora de `REQUIRED_FIELDS` p/ retrocompat) | CA1 |
| `scripts/pipeline/state-cli.ts` | subcomando `supersede <ticket> --by <winner>`; roteado junto de init/close/render | CA2 |
| `scripts/pipeline/dashboard.ts` | `Summary.superseded`; `summarize` não joga mais status desconhecido em `blocked`; header markdown; `--filter closed` inclui superseded | CA3 |
| `scripts/pipeline/metrics.ts` | `StatusBreakdown.superseded`; caso no `byStatusOf`; linha `\| superseded \|` no markdown | CA4 |
| `scripts/pipeline/render-state-md.ts` | header cita `Superseded by:` quando presente | CA5 |

## Decisões de design

- **`closed-rejected` é reclassificável.** O bloqueio de `supersede` cobre só sucesso definitivo
  (`closed-green`) e idempotência (`superseded`) — `SUPERSEDE_BLOCKED_STATUSES`. Um ticket
  rejeitado/abandonado pode depois revelar-se duplicata. Isso viabiliza a migração CA6 via o
  próprio comando (dogfooding), sem editar STATE.json à mão. CA-S3 (testa `closed-green`) intacto.
- **`superseded` entra em `--filter closed`** (decisão deixada ao W1 pelo CA3): é um estado de
  encerramento; some de `open`, aparece em `closed`, com contagem própria no summary. Nenhum
  teste do W0 amarrava isso.
- **`supersededBy` opcional**, não nullable — `exactOptionalPropertyTypes` exige ausência (não
  `undefined` explícito) quando não-superseded. STATE.json legados (57) seguem válidos.

## CA6 — migração executada via comando

```bash
pnpm run pipeline:state supersede CTR-INFRA-READONLY-BI-GRANT --by CTR-INFRA-READONLY-BI-AUTH
# superseded: CTR-INFRA-READONLY-BI-GRANT (by CTR-INFRA-READONLY-BI-AUTH)
```

Efeito nas métricas: `closed-rejected: 1 → 0`, `superseded: 0 → 1`. GRANT agora aparece em
`--filter closed` como `superseded`. Nota de fechamento do GRANT atualizada.

## Gate

```
# suites de pipeline
node --test ... tests/pipeline/*.test.ts        → tests 43 · pass 43 · fail 0
# suíte completa
pnpm test                                        → tests 1203 · pass 1187 · fail 0 · skipped 16
# typecheck
pnpm run typecheck                               → limpo
```

## Nota fora de escopo (resolvido na sessão)

`pnpm test` acusou 1 falha pré-existente em `tests/regression/reports-2026-05-15.test.ts`
(REGR #10). Causa: artefato local `cli-state.json` (gitignored, untracked, demo SQLite de
14/mai anterior ao ADR-0020) com schema inválido — o CLI de contratos retornava `74` (I/O) antes
de validar a flag `--no-stat`, mascarando o `64` esperado. **Não é regressão deste ticket** nem
ocorre em CI (arquivo ausente). Artefato movido para backup em `/tmp`; suíte voltou a 0 falhas.

Hardening latente identificado (NÃO implementado — outro módulo, exige ticket próprio): o CLI de
contratos deveria validar flags desconhecidas **antes** de carregar o state, para que um typo
falhe com `64` mesmo com `cli-state.json` corrompido.

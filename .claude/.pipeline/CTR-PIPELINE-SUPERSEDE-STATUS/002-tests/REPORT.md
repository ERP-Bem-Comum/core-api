# W0 (RED) — CTR-PIPELINE-SUPERSEDE-STATUS

**Skill:** tdd-strategist
**Data:** 2026-05-27
**Resultado:** 🔴 RED — 9 testes novos falham por inexistência da API; 28 pré-existentes seguem verdes.

## Comando

```bash
node --test --experimental-strip-types --no-warnings \
  tests/pipeline/state-cli.test.ts tests/pipeline/dashboard.test.ts \
  tests/pipeline/metrics.test.ts tests/pipeline/render-state-md.test.ts
# ℹ tests 37 · pass 28 · fail 9 · skipped 0
```

Os 9 RED isolados (`--test-name-pattern="CA-S[123]|CA-D[12]|CA-M[123]|CA-R1"`): `tests 9 · pass 0 · fail 9`.

## Testes RED adicionados

Blocos `describe` novos anexados às suites existentes (mirror do tooling em `scripts/pipeline/`).

### `tests/pipeline/state-cli.test.ts` — comando `supersede` (CA2 do request)

| Teste | Exige no W1 | Falha hoje porque |
| :--- | :--- | :--- |
| CA-S1 | `supersede <t> --by <w>` seta `status:'superseded'` + `supersededBy` + `closedAt`, **sem** exigir waves done | subcomando inexistente → exit 1 (`wave id obrigatória`) |
| CA-S2 | sem `--by` → erro citando a flag, status inalterado | stderr atual não cita `--by` |
| CA-S3 | recusa ticket já terminal (`closed-green`) → exit 2 | subcomando inexistente → exit 1 |

### `tests/pipeline/dashboard.test.ts` — superseded no resumo (CA3)

| Teste | Exige no W1 | Falha hoje porque |
| :--- | :--- | :--- |
| CA-D1 | `summary.blocked === 0` p/ superseded + campo próprio `summary.superseded` no JSON | `summarize` joga status desconhecido no `else → blocked++`; campo `superseded` inexiste |
| CA-D2 | linha-resumo do markdown mostra `0 blocked` | idem — hoje renderiza `1 blocked` |

### `tests/pipeline/metrics.test.ts` — superseded nas métricas (CA4)

| Teste | Exige no W1 | Falha hoje porque |
| :--- | :--- | :--- |
| CA-M1 | `byStatus.superseded` conta o status | `byStatusOf` tem `switch` sem caso `superseded` |
| CA-M2 | soma das linhas de status === `total` | superseded some do switch → soma < total |
| CA-M3 | `renderMetricsMd` emite `\| superseded \| N \|` | tabela Status não tem a linha |

### `tests/pipeline/render-state-md.test.ts` — STATE.md (CA5)

| Teste | Exige no W1 | Falha hoje porque |
| :--- | :--- | :--- |
| CA-R1 | header rotula `superseded` e cita o `supersededBy` | `renderStateMd` não imprime `supersededBy` |

## Decisões de teste

- **CA-D3 descartado:** "superseded não aparece em `--filter open`" já é verde hoje (`filterMatches('open')`
  só casa `open`/`in-progress`). Teste verde no W0 fere o fail-first e não mapeia trabalho de W1 —
  removido. A garantia de que superseded **não** vá para `open` fica implícita em CA-D1/CA-D2.
- **`closed` vs terminal-próprio:** o request (CA3) deixou para o W1 decidir se superseded entra
  em `--filter closed`. **Nenhum teste do W0 amarra essa decisão** — apenas exigimos que NÃO seja `blocked`.
- **Tipagem em W0:** fixtures usam `status:'superseded'` e campo `supersededBy` antes de existirem
  no enum/tipo. Sem fricção: `pnpm test` roda via `--experimental-strip-types` (sem checagem de
  tipo); o `tsc` do W3 só será exigido após o W1 adicionar `'superseded'` ao `TicketStatus` e o
  campo opcional `supersededBy?: string` ao `PipelineState`.

## Mapa W1 (arquivos a tocar)

- `scripts/pipeline/state-schema.ts` — `TicketStatus += 'superseded'`; `PipelineState.supersededBy?: string`.
- `scripts/pipeline/state-cli.ts` — subcomando `supersede` (no roteador `main`, junto de init/close/render).
- `scripts/pipeline/dashboard.ts` — `Summary.superseded`; `summarize` para de mandar desconhecido p/ blocked.
- `scripts/pipeline/metrics.ts` — `StatusBreakdown.superseded`; `byStatusOf`; `renderMetricsMd`.
- `scripts/pipeline/render-state-md.ts` — rotular `supersededBy` no header.
- Migração (CA6): reclassificar `CTR-INFRA-READONLY-BI-GRANT` de `closed-rejected` → `superseded`.

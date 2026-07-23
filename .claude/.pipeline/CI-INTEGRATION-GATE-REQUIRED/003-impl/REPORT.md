# W1 — REPORT (GREEN) · CI-INTEGRATION-GATE-REQUIRED (#523 Fase 2)

## Mudança (config + teste)

- `.github/workflows/integration.yml`: removido `continue-on-error: true` do job `integration` (linha 37).
  Comentários da Fase 0 (job da matrix + job `gate`) reescritos para a Fase 2. As 2 ocorrências restantes
  de "continue-on-error" são **comentário** ("Sem `continue-on-error`"), não diretiva.
- `tests/scripts/integration-matrix-workflow.test.ts`: CA3 invertido — `assert.doesNotMatch(/continue-on-error: true/)`.

## RED→GREEN

- W0: teste exige AUSÊNCIA do flag → RED (workflow ainda tinha). 
- W1: flag removido → **13 pass · 0 fail** (o skip do CA4 segue skip).

## Validação

`python3 yaml.safe_load` → parse OK. `grep '|| true'` → 0. `prettier --check` ✅ · `typecheck` ✅ · `lint` ✅.

## Efeito

O `gate` agora reflete o resultado real: um leg vermelho torna `needs.integration.result=failure` → gate
falha. **NÃO bloqueia merge por si só** — só passa a bloquear quando o humano marcar `integração (gate)`
como required no branch protection de dev/main (CA4, op de repo pós-merge). Ordem crítica (M1 do #523):
remover o flag (este PR) ANTES de marcar required — nunca o inverso.

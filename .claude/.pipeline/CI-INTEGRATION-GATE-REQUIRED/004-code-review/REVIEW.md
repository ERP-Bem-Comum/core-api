# W2 — REVIEW · CI-INTEGRATION-GATE-REQUIRED (#523 Fase 2)

**Veredito: APPROVED** (1 nit não-bloqueante). Ângulo: integridade do gate de CI (o M1 do #523).
Executor: `security-backend-expert`. Read-only.

## 1. Pré-condição (CA1) — SATISFEITA, verificada independentemente

4 defeitos corrigidos e **mergeados na `dev`**: #519 (PR #541), #520 (#542), #521 (#543), #522 (#544).
Inspeção do run do #544: **14/14 jobs `success`** (13 legs + `gate`) e **zero step com
`conclusion=failure`** — decisivo, porque com `continue-on-error:true` o job vira `success` mas o step
vermelho permaneceria `failure`. Não há step vermelho ⇒ a matriz é genuinamente verde, não mascarada.

Ressalva de precisão (não-bloqueante): as issues #519–#522 seguem **OPEN** no GitHub (convenção do repo —
PR→dev não auto-fecha issue). Logo "fechados" nos comentários/report deve ler "corrigidos/mergeados".

## 2. Gate acurado — SIM

`continue-on-error` removido do job; as 2 ocorrências restantes são comentário. Zero `|| true`, zero
mask por-leg. Cadeia: `fail-fast:false` + sem `continue-on-error` → leg vermelho ⇒ `conclusion=failure`
⇒ `needs.integration.result=failure` ⇒ `gate` (`if: always()`) roda `test "$result"="success"` → exit 1
⇒ gate vermelho. Fail-closed correto.

## 3. Ordem crítica (M1) — DOCUMENTADA

`000-request.md` §"ordem é crítica" + CA4 + comentários do workflow: (1) mergear este PR → gate acurado
mas ainda não-required; (2) só então marcar `integração (gate)` required no branch protection. Marcar
antes seria fail-open (= status quo de hoje, não regressão). Sem enforcement mecânico possível no repo;
mitigação por documentação é adequada.

## 4. Nada mais mudou — CONFIRMADO

`git diff --stat` = só os 2 arquivos. Matrix, SHAs pinados, `permissions: contents:read`, `secrets:setup`,
step MinIO, invocação do runner, lógica do `gate` — intactos. Teste: só o CA3 invertido
(`match`→`doesNotMatch`) + rename. Suíte: 14 · pass 13 · fail 0 · skip 1 (CA4).

## Nit (follow-up no W3, sem reabrir wave)

Cabeçalho do teste (`integration-matrix-workflow.test.ts`, seção "CA4 — MATRIZ ESPERADA") ficou estagnado:
ainda diz `continue-on-error:true` e "4 defeitos abertos", listando 5 legs como vermelhos que agora são
verdes. Atualizar para a Fase 2 (ou marcar como histórico). Comentário de teste `skip` — não afeta
comportamento.

**Liberado para W3.**

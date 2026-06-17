# W2 — Code Review (CTR-SWEEPER-JOB-LOCK)

**Veredito:** ✅ APPROVED · **Disciplina:** code-reviewer (read-only) · **Round:** 1/3
**Blocker:** 0 · **Major:** 0 · **Minor:** 1 (aceito)

## Escopo

Piloto da coordenação de jobs one-shot: tabela `ctr_job_runs` + `claimJobRun` (INSERT IGNORE) +
integração no sweeper do contracts.

## Conformidade

- **Lock de eficiência (Kleppmann / doc de pesquisa).** O sweep já é idempotente; o claim é backstop
  sobre o cron singleton (ADR-0041). INSERT IGNORE numa PK = dedup atômico, sem fencing (não precisa —
  é eficiência, não correção). Coerente com a recomendação registrada. ✅
- **Isolamento (ADR-0014).** Tabela `ctr_*` no contracts; piloto fica num único módulo (sem misturar BCs). ✅
- **ADR-0020.** `INSERT IGNORE` permitido; sem JSON/ENUM/AUTO_INCREMENT; PK composta varchar. ✅
- **Boundary.** `claimJobRun` converte erro → `Result`; o sweeper trata `!ok` (exit 1) e `false` (skip,
  exit 0) distintamente. ✅
- **Validado contra MySQL real:** adquire na 1ª chamada, não adquire na 2ª (mesma chave) — integração 88/88. ✅

## Minor (aceito)

1. `runKey` usa a data **UTC** (`toISOString().slice(0,10)`), enquanto o sweep roda 00:05 `America/Sao_Paulo`.
   Como 00:05 SP = 03:05 UTC (mesmo dia), a chave diária é estável; a dedup é por execução, não depende do
   fuso exato. Aceito; se um dia o horário do cron mudar para perto da meia-noite UTC, revisar para `clock.today()`.

## Nota de processo

Incidente de working tree no W1 (`repos/` movido) foi corrigido e verificado (restauração do HEAD;
sem recorrência) — registrado no 003-impl/REPORT.md. Não afetou o código entregue.

## Verificação

```
typecheck / lint → verde · test:integration (contracts) → 88/88
```

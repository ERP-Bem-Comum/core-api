# CI-INTEGRATION-MATRIX — W2 (code review READ-ONLY) — #523

**Executor:** `security-backend-expert` (ângulo supply-chain + correção do gate). Round 1/3.

## Veredito: APPROVED

`.github/workflows/integration.yml` seguro por construção no eixo supply-chain + gate. Todas as
invariantes de segurança do W0 verificadas. **Blocker 0 · Major 1 · Minor 3.**

O APPROVED vem com **1 ressalva de rollout obrigatória** (M1), que é disciplina de processo, não
defeito do arquivo.

## M1 (Major) — não marcar o gate required enquanto `continue-on-error: true` existir

Com `continue-on-error: true` (report-only da Fase 0), `needs.integration.result` agrega como
`success` mesmo com legs vermelhos — o check `integração (gate)` aparece verde em toda run da Fase 0.
Se alguém marcar o `gate` como required **antes** de remover o `continue-on-error`, nasce um gate
**permanentemente verde** — o mesmo furo de gate-integrity (CWE-703) que a #523/#521 combatem.

Não é defeito do YAML (ele implementa fielmente o report-only pedido no CA3/CA5). É armadilha de
**sequência**: a Fase 2 (remover `continue-on-error` + marcar required) tem de ser **um passo atômico**,
nunca em ordem invertida. Ação: registrar no runbook da Fase 2 + reforçar o comentário no YAML em voz
imperativa ("NÃO marcar required enquanto esta linha existir").

## Minor (hardening, não-bloqueantes)

- **m1** — `${{ matrix.suite }}` no `run:` é **seguro** (allowlist estática no YAML versionado, não
  input não-confiável; sem CWE-94 explorável). Env-indirection como defense-in-depth, opcional.
- **m2** — sem `timeout-minutes` nos jobs (herda 360 min). Job travado retém runner por 6 h. **É
  padrão do repo** (`ci.yml` e `integration-notifications.yml` também não têm) — não é regressão desta
  fatia; sugerir `timeout-minutes: 15`/`5` como follow-up transversal.
- **m3** (informacional) — `needs.integration.result` no `run:` do gate é enum fixo do GitHub, seguro.

## Correção do gate — não-burlável na Fase 2, inerte por design na Fase 0

- **Furo do `|| true` (#521): FECHADO.** Nenhum `run:` tem `|| true`. Diagnóstico é step separado sob
  `if: failure()` — não mascara o exit code do runner.
- **Exit code íntegro:** runner faz `process.exitCode = main()` + `spawnSync(...).status ?? 1`
  (fail-closed). O gate confia em `needs.integration.result`, não parseia o sumário do `node:test`.
- **Agregação fail-closed:** `result == 'success'` só se todos os legs passarem; qualquer
  failure/cancelled/skipped → gate vermelho. `if: always()` garante que o gate roda mesmo com matrix
  vermelha.
- **Virada Fase 2 = 1 linha** (remover `continue-on-error`, é job-level; não há por-leg espalhado).

## Supply-chain (ADR-0011)

- **SHAs pinados (40 hex) e idênticos ao `ci.yml`:** `checkout@df4cb1c0…`, `setup-node@48b55a01…`. São
  os únicos dois `uses:`. Nenhuma action de terceiro, nenhuma tag flutuante.
- **`permissions: contents: read`** no nível do workflow — mínimo necessário. Espelha `ci.yml`.
- **`pull_request` (não `_target`)** + schedule + workflow_dispatch. PR de fork roda read-only, sem
  secrets. Nenhum `pull_request_target`/`workflow_run`.
- **Nenhum `${{ secrets.* }}`.** Secrets são gerados por `secrets:setup` + valores de teste do runner
  (já públicos no repo). PR de fork roda a matrix sem precisar de segredo do repo; nada a exfiltrar.
- **`ubuntu-latest`** (GitHub-hosted, efêmero) nos dois jobs — `down -v` inofensivo; nenhum
  self-hosted.

## Conformidade estrutural com os CAs

CA1 ✔ · CA2 ✔ · CA3 ✔ · CA5 ✔ · CA6 ✔. CA4 (matriz esperada) é validável só no W3.

**Liberado para W3.** Sem Blocker; M1 é condição da Fase 2 (fora desta fatia); Minor são hardening
opcional.

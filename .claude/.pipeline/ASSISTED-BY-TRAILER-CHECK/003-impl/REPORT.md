# W1 — ASSISTED-BY-TRAILER-CHECK (#549) — GREEN

## Arquivos

- `scripts/ci/check-commit-trailers.ts` — função pura `checkCommitTrailers(commits, {aiAssisted})` +
  `main()` (glue: lê o range do PR via `git log --format=%H%x1f%(trailers:key=Assisted-by,...)`, exit 1
  na violação). Guard `process.argv[1] === fileURLToPath(import.meta.url)` para NÃO rodar no import do teste.
- `.github/workflows/commit-policy.yml` — job `commit-policy (Assisted-by)`, SHA-pinado (checkout +
  setup-node do repo), `fetch-depth: 0` (precisa do range base..head), gatilhos incluem
  `labeled/unlabeled` (reavalia quando a label muda), `PR_AI_ASSISTED` derivado de
  `contains(...labels.*.name, 'ai-assisted')`.

## Validação (smoke do `main()` contra git real)

| cenário | resultado |
| --- | --- |
| W0 test unitário | 6/6 GREEN |
| sem label, 7 commits reais da dev | `OK — 7 commit(s) conformes`, **exit 0** |
| com label, commits reais (sem Assisted-by) | 4× `missing-assisted-by`, **exit 1** |
| `BASE_SHA` ausente (guard) | **exit 1** |

Gate falha de verdade (exit 1) na violação; passa (exit 0) no caminho limpo. `format=%x1f`/`%x1e`
como separadores (robusto a espaço/quebra em mensagem de commit).

## Regra label-gated

Exige a label **`ai-assisted`** no repo (criada no bootstrap). Quem abre PR de sessão de IA marca a
label → todos os commits precisam do trailer. Sem a label, só valida o formato quando presente.

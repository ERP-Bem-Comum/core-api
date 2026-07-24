# W2 — ASSISTED-BY-TRAILER-CHECK (#549) — REVIEW (round 1)

**Disciplina:** `code-reviewer` (read-only). **Veredito: APPROVED** (1 achado de lint corrigido no turno).

## Achados

### M1 (Major) — lint `consistent-type-definitions` — CORRIGIDO

`type CommitTrailers = {...}` / `type TrailerViolation = {...}` violavam
`@typescript-eslint/consistent-type-definitions` (repo exige `interface` para shapes de objeto).
Convertidos para `interface`. `pnpm run lint` volta verde. (Um lembrete do porquê o gate de qualidade
roda no worktree ANTES do PR — [[subagent-edits-skip-prettier-lint-hooks]].)

## Verificações (sem achado)

- **Sem injeção:** `execFileSync('git', [args])` com args fixos — nunca shell string; o range vem de
  `BASE_SHA`/`HEAD_SHA` (SHAs do evento do PR), não de input arbitrário.
- **Guard de import:** `main()` só roda quando o script é o entrypoint — o teste importa a função pura
  sem disparar git/exit.
- **Gate real:** exit 1 na violação e no guard de `BASE_SHA` ausente (provado no smoke). Sem
  `continue-on-error`/`|| true`.
- **`fetch-depth: 0`:** necessário — sem o histórico completo, `git log base..head` falharia.
- **Label-gated correto:** `contains(labels.*.name, 'ai-assisted')` + gatilhos `labeled/unlabeled`
  reavaliam ao togglar a label.

## Escopo/afrouxamento

Presença de Assisted-by é exigida SÓ sob a label `ai-assisted` (decisão do dono) — não é afrouxamento,
é o desenho escolhido (a detecção mecânica de "commit de IA" não existe). O formato é sempre validado.
